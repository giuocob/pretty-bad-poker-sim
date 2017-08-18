// HAND CLASSIFICATIONS
// 'Hand' is the player's 2-card pocket plus any available community cards.

'use strict';
const XError = require('xerror');
const cardUtils = require('./card-utils');

/*
First, result classfications, which is the best 5-card hand available to the player.
Here are the possible results and their formats:
{ type: 'straight-flush', suit: 1, highValue: 9 },
{ type: 'four-of-a-kind', value: 4, kickerValues: [ 11 ] }
{ type: 'full-house', threeValue: 8, twoValue: 14 }
{ type: 'flush', suit: 3, kickerValues: [ 14, 12, 9, 6, 4 ] }
{ type: 'straight', highValue: 5 }
{ type: 'three-of-a-kind', value: 11, kickerValues: [ 7, 6, 5 ] }
{ type: 'two-pair', values: [ 12, 9 ], kickerValues: [ 10 ] }
{ type: 'pair', value: 14, kickerValues: [ 13, 9, 7 ] }
{ type: 'high-cards', kickerValues: [ 14, 13, 12, 10, 8 ] }
Each result object also has a 'cardIds' property with the 5 cards that comprise the result (unsorted).
*/

function getCardIdsFromCardArray(cardArray) {
	return cardArray.map((card) => card.cardId);
}

function getCardValuesFromCardArray(cardArray) {
	return cardArray.map((card) => card.value);
}

// Returns cards from the hand that don't exist in the result group (the "kickers"), sorted by value
function getKickers(cardsInHand, resultCards) {
	let resultCardIds = {};
	let kickers = [];
	for (let resultCard of resultCards) {
		resultCardIds[resultCard.cardId] = true;
	}
	for (let card of cardsInHand) {
		if (!resultCardIds[card.cardId]) kickers.push(card);
	}
	return kickers.sort((a, b) => {
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		if (a.suit > b.suit) return -1;
		if (a.suit < b.suit) return 1;
		return 0;
	});
}

// Compares two ordered arrays of values (e.g. kickers or values of a two-pair hand).
function compareValueArrays(a, b) {
	if (a.length !== b.length) {
		throw new XError(XError.INTERNAL_ERROR, 'Attempted to compare value arrays of unequal length');
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] > b[i]) return -1;
		if (a[i] < b[i]) return 1;
	}
	return 0;
}

// Context contains the precomputed properties cardIds, cards, cardsByValue, cardGroupsBySize, cardsBySuit
const evaluators = {
	'straight-flush': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let currentStraight;
			let acesBySuit = {};  // For checking wraparound straight at the end
			for (let card of context.cardsBySuit) {
				if (card.value === 14) {
					acesBySuit[card.suit] = card;
				}
				if (!currentStraight) {
					currentStraight = [ card ];
				} else if (
					card.suit === currentStraight[0].suit &&
					card.value === currentStraight[currentStraight.length - 1].value - 1
				) {
					// Valid next entry in straight
					currentStraight.push(card);
					if (currentStraight.length === 5) {
						// Straight flush GET
						break;
					}
					// Check for wraparound straight
					if (
						currentStraight.length === 4 &&
						currentStraight[currentStraight.length - 1].value === 2 &&
						acesBySuit[currentStraight[0].suit]
					) {
						// Straight flush GET
						currentStraight.push(acesBySuit[currentStraight[0]]);
						break;
					}
				} else {
					// Reset
					currentStraight = [ card ];
				}
			}
			if (currentStraight.length === 5) {
				return {
					suit: currentStraight[0].suit,
					highValue: currentStraight[0].value,
					cardIds: getCardIdsFromCardArray(currentStraight)
				}
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.highValue > b.highValue) return -1;
			if (a.highValue < b.highValue) return 1;
			return 0;
		}
	},
	'four-of-a-kind': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let winningGroup;
			for (let cardGroup of context.cardGroupsBySize) {
				if (cardGroup.length > 4) continue;
				if (cardGroup.length === 4) winningGroup = cardGroup;
				break;
			}
			if (winningGroup) {
				let kickers = getKickers(context.cards, winningGroup);
				return {
					value: winningGroup[0].value,
					kickerValues: getCardValuesFromCardArray(kickers.slice(0, 1)),
					cardIds: getCardIdsFromCardArray(winningGroup.concat([ kickers[0] ]))
				}
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.value > b.value) return -1;
			if (a.value < b.value) return 1;
			return compareValueArrays(a.kickerValues, b.kickerValues);
		}
	},
	'full-house': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let threeGroup, twoGroup;
			for (let cardGroup of context.cardGroupsBySize) {
				if (cardGroup.length > 3) {
					continue;
				} else if (cardGroup.length === 3) {
					if (!threeGroup) threeGroup = cardGroup;
					continue;
				} else if (cardGroup.length === 2) {
					if (!twoGroup) twoGroup = cardGroup;
					break;
				} else {
					break;
				}
			}
			if (threeGroup && twoGroup) {
				return {
					threeValue: threeGroup[0].value,
					twoValue: twoGroup[0].value,
					cardIds: getCardIdsFromCardArray(threeGroup.concat(twoGroup))
				}
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.threeValue > b.threeValue) return -1;
			if (a.threeValue < b.threeValue) return 1;
			if (a.twoValue > b.twoValue) return -1;
			if (a.twoValue < b.twoValue) return 1;
			return 0;
		}
	},
	'flush': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let currentFlush;
			for (let card of context.cardsBySuit) {
				if (!currentFlush) {
					currentFlush = [ card ];
				} else if (card.suit === currentFlush[0].suit) {
					currentFlush.push(card);
					if (currentFlush.length === 5) {
						return {
							suit: currentFlush[0].suit,
							kickerValues: getCardValuesFromCardArray(currentFlush),
							cardIds: getCardIdsFromCardArray(currentFlush)
						};
					}
				} else {
					currentFlush = [ card ];
				}
			}
			return null;
		},
		compareResults: function(a, b) {
			return compareValueArrays(a.kickerValues, b.kickerValues);
		}
	},
	'straight': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let currentStraight;
			let aceCard;  // Highest ranking ace goes here for wraparound straight check
			for (let card of context.cardsByValue) {
				if (card.value === 14 && !aceCard) {
					aceCard = card;
				}
				if (!currentStraight) {
					currentStraight = [ card ];
				} else if (card.value === currentStraight[currentStraight.length - 1].value) {
					// Ignore pair inside straight and keep going
					continue;
				} else if (card.value === currentStraight[currentStraight.length - 1].value - 1) {
					// Valid next entry in straight
					currentStraight.push(card);
					if (currentStraight.length === 5) {
						break;
					}
					// Check for wraparound straight
					if (
						currentStraight.length === 4 &&
						currentStraight[currentStraight.length - 1].value === 2 &&
						aceCard
					) {
						currentStraight.push(aceCard);
						break;
					}
				} else {
					// Reset
					currentStraight = [ card ];
				}
			}
			if (currentStraight.length === 5) {
				return {
					highValue: currentStraight[0].value,
					cardIds: getCardIdsFromCardArray(currentStraight)
				};
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.highValue > b.highValue) return -1;
			if (a.highValue < b.highValue) return 1;
			return 0;
		}
	},
	'three-of-a-kind': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let threeGroup;
			for (let cardGroup of context.cardGroupsBySize) {
				if (cardGroup.length > 3) {
					continue;
				} else if (cardGroup.length === 3) {
					if (!threeGroup) threeGroup = cardGroup;
					break;
				} else {
					break;
				}
			}
			if (threeGroup) {
				let kickers = getKickers(context.cards, threeGroup).slice(0, 2);
				return {
					value: threeGroup[0].value,
					kickerValues: getCardValuesFromCardArray(kickers),
					cardIds: getCardIdsFromCardArray(threeGroup.concat(kickers))
				};
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.value > b.value) return -1;
			if (a.value < b.value) return 1;
			return compareValueArrays(a.kickerValues, b.kickerValues);
		}
	},
	'two-pair': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let groups = [];
			for (let cardGroup of context.cardGroupsBySize) {
				if (cardGroup.length > 2) {
					continue;
				} else if (cardGroup.length === 2) {
					groups.push(cardGroup);
					if (groups.length === 2) {
						break;
					}
				} else {
					break;
				}
			}
			if (groups.length === 2) {
				let twoPairCards = groups[0].concat(groups[1]);
				let kickers = getKickers(context.cards, twoPairCards).slice(0, 1);
				return {
					values: [ groups[0][0].value, groups[1][0].value ],
					kickerValues: getCardValuesFromCardArray(kickers),
					cardIds: getCardIdsFromCardArray(twoPairCards.concat(kickers))
				};
			}
			return null;
		},
		compareResults: function(a, b) {
			let valuesArrayResult = compareValueArrays(a.values, b.values);
			if (valuesArrayResult !== 0) return valuesArrayResult;
			return compareValueArrays(a.kickerValues, b.kickerValues);
		}
	},
	'pair': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			let twoGroup;
			for (let cardGroup of context.cardGroupsBySize) {
				if (cardGroup.length > 2) {
					continue;
				} else if (cardGroup.length === 2) {
					if (!twoGroup) twoGroup = cardGroup;
					break;
				} else {
					break;
				}
			}
			if (twoGroup) {
				let kickers = getKickers(context.cards, twoGroup).slice(0, 3);
				return {
					value: twoGroup[0].value,
					kickerValues: getCardValuesFromCardArray(kickers),
					cardIds: getCardIdsFromCardArray(twoGroup.concat(kickers))
				};
			}
			return null;
		},
		compareResults: function(a, b) {
			if (a.value > b.value) return -1;
			if (a.value < b.value) return 1;
			return compareValueArrays(a.kickerValues, b.kickerValues);
		}
	},
	'high-cards': {
		minHandSize: 5,
		maxHandSize: 7,
		isResult: true,
		evaluate: function(context) {
			// Returns 5 highest cards whether pairs exist or not
			let kickers = context.cardsByValue.slice(0, 5);
			return {
				kickerValues: getCardValuesFromCardArray(kickers),
				cardIds: getCardIdsFromCardArray(kickers)
			}
		},
		compareResults: function(a, b) {
			return compareValueArrays(a.kickerValues, b.kickerValues)
		}
	}
};

// The strength ordering of each result evaluator.
const resultEvaluatorOrder = [
	'straight-flush',
	'four-of-a-kind',
	'full-house',
	'flush',
	'straight',
	'three-of-a-kind',
	'two-pair',
	'pair',
	'high-cards'
];
const resultEvaluatorOrderMap = {};
for (let i = 0; i < resultEvaluatorOrder.length; i++) {
	resultEvaluatorOrderMap[resultEvaluatorOrder[i]] = i;
};


// Get a context object containing precomputed properties
function getEvalContext(hand) {
	if (hand.length < 5) throw new XError(XError.INVALID_ARGUMENT, 'Hand must have at least 5 cards');
	if (hand.length > 7) throw new XError(XError.INVALID_ARGUMENT, 'Impossible number of cards in hand');
	let cards = hand.map((card) => cardUtils.getCardComponents(card));

	// Descending by value
	let cardsByValue = cards.slice().sort((a, b) => {
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		if (a.suit > b.suit) return -1;
		if (a.suit < b.suit) return 1;
		return 0; 
	});

	// Cards with same value grouped together, sorted descending by size of group, then by value
	let cardGroupsBySize = [];
	let currentGroup;
	for (let card of cardsByValue) {
		if (!currentGroup) {
			currentGroup = [ card ];
		} else if (card.value === currentGroup[0].value) {
			currentGroup.push(card);
		} else {
			cardGroupsBySize.push(currentGroup);
			currentGroup = [ card ];
		}
	}
	if (currentGroup) cardGroupsBySize.push(currentGroup);
	cardGroupsBySize.sort((a, b) => {
		if (a.length > b.length) return -1;
		if (a.length < b.length) return 1;
		if (a[0].value > b[0].value) return -1;
		if (a[0].value < b[0].value) return 1;
		return 0;
	});

	// Descending by suit, descending by value
	let cardsBySuit = cards.slice().sort((a, b) => {
		if (a.suit > b.suit) return -1;
		if (a.suit < b.suit) return 1;
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		return 0;
	});

	// Antiduplication check
	for (let i = 0; i < cardsBySuit.length - 1; i++) {
		if (cardsBySuit[i].cardId === cardsBySuit[i + 1].cardId) {
			throw new XError(XError.INVALID_ARGUMENT, 'Poker hand contains duplicate cards');
		}
	}

	return {
		hand,
		cards,
		cardsByValue,
		cardGroupsBySize,
		cardsBySuit
	};
}

function getHandResult(hand) {
	let evalContext = getEvalContext(hand);
	for (let evaluatorId of resultEvaluatorOrder) {
		let evaluator = evaluators[evaluatorId];
		let result = evaluator.evaluate(evalContext);
		if (result) {
			result.type = evaluatorId;
			return result;
		}
	}
	throw new XError(XError.INTERNAL_ERROR, 'Could not calculate result of hand!');
}

// Compare two hand results to see which is stronger. Return -1 if a is stronger, and 1 if b is stronger.
function compareHandResults(a, b) {
	let aIndex = resultEvaluatorOrderMap[a.type];
	let bIndex = resultEvaluatorOrderMap[b.type];
	if (typeof aIndex !== 'number' || typeof bIndex !== 'number') {
		throw new XError(XError.INVALID_ARGUMENT, 'Hand result has invalid type');
	}
	if (aIndex < bIndex) return -1;
	if (aIndex > bIndex) return 1;
	// Otherwise evaluators are the same; use specific comparator
	return evaluators[a.type].compareResults(a, b);
}

module.exports = {
	getHandResult,
	compareHandResults
};
