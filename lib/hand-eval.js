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
{ type: 'nothing', kickerValues: [ 14, 13, 12, 10, 8 ] }
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
		}
	}
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

	let orderedEvaluators = [
		'straight-flush',
		'four-of-a-kind',
		'full-house'
	];
	for (let evaluatorId of orderedEvaluators) {
		let evaluator = evaluators[evaluatorId];
		let result = evaluator.evaluate(evalContext);
		if (result) {
			result.type = evaluatorId;
			return result;
		}
	}

	return { type: 'SUPERLAME' };
}

module.exports = {
	getHandResult
};
