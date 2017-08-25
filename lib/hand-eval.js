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
				if (card.value === cardUtils.ACE) {
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
						currentStraight.push(acesBySuit[currentStraight[0].suit]);
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
				if (cardGroup.length >= 4) winningGroup = cardGroup.slice(0, 4);
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
				if (cardGroup.length >= 3) {
					if (!threeGroup) {
						threeGroup = cardGroup.slice(0, 3);
						continue;
					} else if (!twoGroup) {
						twoGroup = cardGroup.slice(0, 2);
						break;
					}
					continue;
				} else if (cardGroup.length === 2) {
					if (!twoGroup) {
						twoGroup = cardGroup.slice(0, 2);
					}
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
				if (card.value === cardUtils.ACE && !aceCard) {
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
				if (cardGroup.length >= 3) {
					if (!threeGroup) threeGroup = cardGroup.slice(0, 3);
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
				if (cardGroup.length >= 2) {
					groups.push(cardGroup.slice(0, 2));
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
				if (cardGroup.length >= 2) {
					if (!twoGroup) twoGroup = cardGroup.slice(0, 2);
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
	},

	// Non-result evaluators
	'flush-draw': {
		minHandSize: 3,
		maxHandSize: 6,
		isResult: false,
		evaluate: function(context) {
			let currentFlush, bestFlush;
			let minFlushLength = 3;
			if (context.cards.length - 2 > minFlushLength) {
				minFlushLength = context.cards.length - 2;
			}
			for (let card of context.cardsBySuit) {
				if (!currentFlush) {
					currentFlush = [ card ];
				} else if (card.suit === currentFlush[0].suit) {
					currentFlush.push(card);
				} else {
					if (!bestFlush || currentFlush.length > bestFlush.length) {
						bestFlush = currentFlush;
					}
					currentFlush = [ card ];
				}
			}
			if (!bestFlush || currentFlush.length > bestFlush.length) {
				bestFlush = currentFlush;
			}

			if (bestFlush.length >= minFlushLength) {
				if (bestFlush.length > 5) bestFlush = bestFlush.slice(0, 5);
				return {
					suit: bestFlush[0].suit,
					remainingCards: 5 - bestFlush.length,
					kickerValues: getCardValuesFromCardArray(bestFlush),
					cardIds: getCardIdsFromCardArray(bestFlush)
				};
			}	
			return null;
		}
	},
	'straight-draw': {
		minHandSize: 3,
		maxHandSize: 6,
		isResult: false,
		evaluate: function(context) {
			let handValueSet = {};
			for (let group of context.cardGroupsBySize) {
				handValueSet[group[0].value] = true;
			}
			if (handValueSet[cardUtils.ACE]) handValueSet[cardUtils.ACE_LOW] = true;
			let handValues = context.cardGroupsBySize.map((group) => group[0].value);
			// Iterate over each possible straight header to find number of missing cards
			let minCardsToStraight = 3;
			if (context.cards.length - 2 > minCardsToStraight) {
				minCardsToStraight = context.cards.length - 2;
			}
			let highestCardsToStraight;
			let highestCardsToStraightCombinations = 0;
			let straightDraws = [];
			let usedCombinations = {};
			for (let straightHead = cardUtils.ACE; straightHead >= cardUtils.FIVE; straightHead--) {
				let neededValues = [];
				for (let k = 0; k <= 4; k++) {
					if (!handValueSet[straightHead - k]) {
						if (straightHead - k === cardUtils.ACE_LOW) {
							neededValues.unshift(cardUtils.ACE);
						} else {
							neededValues.push(straightHead - k);
						}
						if (neededValues.length > 5 - minCardsToStraight) break;
					}
				}
				if (neededValues.length > 5 - minCardsToStraight) continue;
				// We have a valid straight draw
				let cardsToStraight = 5 - neededValues.length;
				let comboKey = 'MADE';  // Default for if this draw is already a full straight
				if (neededValues.length > 0) {
					comboKey = neededValues.join('-');
				}
				if (usedCombinations[comboKey]) {
					// This value combination already yields a stronger straight; ignore it
					continue;
				}
				usedCombinations[comboKey] = true;
				if (!highestCardsToStraight || cardsToStraight > highestCardsToStraight) {
					highestCardsToStraight = cardsToStraight;
					highestCardsToStraightCombinations = 1;
				} else if (cardsToStraight === highestCardsToStraight) {
					highestCardsToStraightCombinations++;
				}
				straightDraws.push({
					cardsToStraight: cardsToStraight,
					highValue: straightHead,
					neededValues: neededValues
				});
			}

			if (highestCardsToStraight) {
				return {
					highestCardsToStraight: highestCardsToStraight,
					highestCardsToStraightCombinations: highestCardsToStraightCombinations,
					draws: straightDraws.sort((a, b) => {
						if (a.cardsToStraight > b.cardsToStraight) return -1;
						if (a.cardsToStraight < b.cardsToStraight) return 1;
						if (a.highValue > b.highValue) return -1;
						if (a.highValue < b.highValue) return 1;
						return 0;
					})
				}
			}
			return null;
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
	let cards = cardUtils.getCardComponentsArray(hand);

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


/*
Given a 2-card pocket, get an evaluation of those cards.
Evaluation looks like this:
{
	cardIds: [ 10, 20 ],  // Input cardIds
	cards: [ { ... }, { ... } ],  // The card components, with higher valued card coming first
	pairValue: 8,  // If this is a pocket pair, the value of the pair; null otherwise
	suitedSuit: 3,  // If this is a suited hand, the suit; null otherwise
	valueSpread: 5,  // The difference between the values of the two cards. Lowest spread is used
	  for ace, e.g. spread of [ As, 3c ] = 2. Null if hand is a pocket pair.
	inclusiveStraightCount: 1,  // The number of possible straights that utilize both pocket cards
	semiInclusiveStraightCount: 2 // The number of possible straights that utilize one pocket card
}
*/
function getPocketEvaluation(pocket) {
	if (pocket.length !== 2) {
		throw new XError(XError.INVALID_ARGUMENT, 'Pocket must have exactly two cards');
	}
	let cards = cardUtils.getCardComponentsArray(pocket);
	cards.sort(function(a, b) {
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		if (a.suit > b.suit) return -1;
		if (a.suit < b.suit) return 1;
		return 0;
	});
	if (cards[0].cardId === cards[1].cardId) {
		throw new XError(XError.INVALID_ARGUMENT, 'Pocket contains duplicate cards');
	}

	let ret = {
		cards: cards,
		cardIds: cards.map((card) => card.cardId),
		pairValue: null,
		suitedSuit: null,
		valueSpread: null,
		inclusiveStraightCount: 0,
		semiInclusiveStraightCount: 0
	};
	if (cards[0].value === cards[1].value) {
		ret.pairValue = cards[0].value;
	}
	if (cards[0].suit === cards[1].suit) {
		ret.suitedSuit = cards[0].suit;
	}

	if (!ret.pairValue) {
		ret.valueSpread = cards[0].value - cards[1].value;
		if (
			(cards[0].value === cardUtils.ACE) && 
			(cards[1].value - cardUtils.ACE_LOW < ret.valueSpread)
		) {
			ret.valueSpread = cards[1].value - cardUtils.ACE_LOW;
		}
	}

	let values = [ cards[0].value ];
	if (!ret.pairValue) values.push(cards[1].value);
	if (values[0] === cardUtils.ACE) {
		values.push(cardUtils.ACE_LOW);
	}
	// Iterate over all possible straights
	for (let straightHead = cardUtils.ACE; straightHead >= cardUtils.FIVE; straightHead--) {
		let includedCards = 0;
		for (let value of values) {
			if (straightHead >= value && (straightHead - value) < 5) {
				includedCards++;
			}
		}
		if (includedCards === 1) ret.semiInclusiveStraightCount++;
		if (includedCards === 2) ret.inclusiveStraightCount++;
	}
	
	return ret;
}


// Call a specific evaluator given its type.
function getEvaluationByType(hand, evaluatorType) {
	let evalContext = getEvalContext(hand);
	let evaluator = evaluators[evaluatorType];
	if (!evaluator) throw new XError(XError.INVALID_ARGUMENT, 'Invalid evaluatorType');
	if (hand.length < evaluator.minHandSize || hand.length > evaluator.maxHandSize) {
		throw new XError(XError.INVALID_ARGUMENT, 'Hand length is out of bounds for evaluator');
	}
	let result = evaluator.evaluate(evalContext);
	if (result) {
		result.type = evaluatorType;
		return result;
	}
	return null;
}

// Given a 5-7 card hand, get the best result for that hand.
function getHandResult(hand) {
	let evalContext = getEvalContext(hand);
	for (let evaluatorType of resultEvaluatorOrder) {
		let evaluator = evaluators[evaluatorType];
		let result = evaluator.evaluate(evalContext);
		if (result) {
			result.type = evaluatorType;
			return result;
		}
	}
	return null;
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

// Get a set of evaluations that fully characterizes a hand's chances of winning / improving.
// Result can have up to three evaluations; the actual current result, straight draw, and flush draw.
function getFullEvaluation(hand) {
	let evalContext = getEvalContext(hand);
	if (hand.length < 5 || hand.length > 7) {
		throw new XError(XError.INVALID_ARGUMENT, 'Hand must be between 5 and 7 cards');
	}
	let ret = {
		result: null,
		evaluations: []
	};

	// Process the hand with the given set of evaluatorsTypes. Inputs should be ordered by strength.
	function processEvaluators(evaluatorTypes) {
		for (let evaluatorType of evaluatorTypes) {
			let evaluator = evaluators[evaluatorType];
			if (!evaluator) throw new XError(XError.INVALID_ARGUMENT, 'Invalid evaluatorType');
			if (hand.length < evaluator.minHandSize || hand.length > evaluator.maxHandSize) {
				continue;
			}
			let evaluation = evaluator.evaluate(evalContext);
			if (evaluation) {
				evaluation.type = evaluatorType;
				ret.evaluations.push(evaluation);
				if (evaluator.isResult) {
					if (ret.result) {
						if (compareHandResults(evaluation, ret.result) < 0) {
							ret.result = evaluation;
						}
					} else {
						ret.result = evaluation;
					}
				}
				return evaluation;
			}
		}
	}

	// First check for hands stronger than a flush (these hands cannot draw to a straight flush)
	processEvaluators([ 'straight-flush', 'four-of-a-kind', 'full-house' ]);
	if (!ret.result) {
		// Evaluate separately for weaker paired hands, flushes, and straights
		processEvaluators([ 'three-of-a-kind', 'two-pair', 'pair', 'high-cards' ]);
		processEvaluators([ 'flush', 'flush-draw' ]);
		processEvaluators([ 'straight', 'straight-draw' ]);
	}
	if (!ret.result) {
		throw new XError(XError.INTERNAL_ERROR, 'Failed to construct hand evaluation!');
	}
	return ret;
}


module.exports = {
	evaluators,
	getPocketEvaluation,
	getEvaluationByType,
	getHandResult,
	compareHandResults,
	getFullEvaluation
};
