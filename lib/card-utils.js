// Utilities for classifying and manipulating the deck of poker cards, the players' hands,
// and the community cards.

'use strict';
const XError = require('xerror');
const randomUtils = require('./random-utils');

/*
Deck of poker cards is represented by a shuffled array of the integers 1 - 52.
The value of a card is its remained when divided by 13 (add 1 for convenience), and its suit is the quotient of (value - 1).

NUMBERS (remainder)
2: 2
3: 3
4: 4
5: 5
6: 6
7: 7
8: 8
9: 9
10: 10
11: Jack
12: Queen
13: King
14: Ace

SUITS (quotient)
1: Clubs
2: Diamonds
3: Hearts
4: Spades
*/

function validateCard(card) {
	if (typeof card !== 'number') throw new XError(XError.INVALID_ARGUMENT, 'Card must be a number');
	if (card % 1 !== 0) throw new XError(XError.INVALID_ARGUMENT, 'Card must be an integer');
	if (card < 1 || card > 52) throw new XError(XError.INVALID_ARGUMENT, 'Card is out of bounds');
}

// Return the suit and value of a card. As a convenience, is a no-op if the object is already a card components object.
function getCardComponents(card) {
	if (
		card &&
		typeof card === 'object' &&
		typeof card.card === 'number' &&
		typeof card.value === 'number' &&
		typeof card.suit === 'number'
	) {
		return card;
	}
	validateCard(card);
	let value = (card % 13) + 1
	if (value === 1) value = 14;
	let suit = Math.floor((card - 1) / 13) + 1;
	return {
		card: card,
		value: value,
		suit: suit
	};
}

// Get a human-readable string for a card's value
let strValueMap = {
	2: { short: '2', long: 'Two' },
	3: { short: '3', long: 'Three' },
	4: { short: '4', long: 'Four' },
	5: { short: '5', long: 'Five' },
	6: { short: '6', long: 'Six' },
	7: { short: '7', long: 'Seven' },
	8: { short: '8', long: 'Eight' },
	9: { short: '9', long: 'Nine' },
	10: { short: 'T', long: 'Ten' },
	11: { short: 'J', long: 'Jack' },
	12: { short: 'Q', long: 'Queen' },
	13: { short: 'K', long: 'King' },
	14: { short: 'A', long: 'Ace' }
};

let strSuitMap = {
	1: { short: 'c', long: 'Clubs' },
	2: { short: 'd', long: 'Diamonds' },
	3: { short: 'h', long: 'Hearts' },
	4: { short: 's', long: 'Spades' }
};

function getCardString(card, longhand) {
	let components = getCardComponents(card);
	let valueObj = strValueMap[components.value];
	let suitObj = strSuitMap[components.suit];
	if (longhand) {
		return `${valueObj && valueObj.long || 'NULL'} of ${suitObj && suitObj.long || 'NULL'}`;
	} else {
		return `${valueObj && valueObj.short || 'NULL'}${suitObj && suitObj.short || 'NULL'}`;
	}
}

function getValueString(value, longhand) {
	let valueObj = strValueMap[value];
	if (longhand) {
		return valueObj && valueObj.long || 'NULL';
	} else {
		return valueObj && valueObj.short || 'NULL';
	}
}

function getSuitString(suit, longhand) {
	let suitObj = strSuitMap[suit];
	if (longhand) {
		return suitObj && suitObj.long || 'NULL';
	} else {
		return suitObj && suitObj.short || 'NULL';
	}
}


// Functions to get a deck of cards.

function getUnshuffledDeck() {
	let deck = [];
	for (let i = 1; i <= 52; i++) {
		deck.push(i);
	}
	return deck;
}

// RNG is optional
function getShuffledDeck(rng) {
	return randomUtils.shuffleArray(getUnshuffledDeck(), rng);
}


// HAND CLASSIFICATIONS
// 'Hand' is the player's 2-card pocket plus any available community cards.

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
Each result object also has a 'cards' property with the 5 cards that comprise the result (unsorted).
*/

function getHandResult(hand) {
	if (hand.length < 5) throw new XError(XError.INVALID_ARGUMENT, 'Hand must have at least 5 cards');
	if (hand.length > 7) throw new XError(XError.INVALID_ARGUMENT, 'Impossible number of cards in hand');
	let handComponents = hand.map((card) => getCardComponents(card));
	// Descending by value
	let handComponentsByValue = handComponents.slice().sort((a, b) => {
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		return 0; 
	});
	// Descending by suit, descending by value
	let handComponentsBySuit = handComponents.slice().sort((a, b) => {
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		if (a.value > b.value) return -1;
		if (a.value < b.value) return 1;
		return 0;
	});

	// First determine if we have a straight (more than one noncontiguous straight is impossibe)
	let straightCards;
	let aceCard;  // Set if we find an ace to check for wraparound straight
	for (let card of handComponentsByValue) {
		console.log(card);
		if (!aceCard && card.value === 14) aceCard = card;
		if (!straightCards) {
			straightCards = [ card ];
		} else if (straightCards[straightCards.length - 1].value === card.value) {
			// Pair within possible straight; keep walking down
		} else if (straightCards[straightCards.length - 1].value === card.value + 1) {
			// Push card onto straight and check if we're done
			straightCards.push(card);
			if (straightCards.length === 5) break;
			if (straightCards.length === 4 && straightCards[0].value === 5 && aceCard) {
				straightCards.push(aceCard);
				break;
			}
		} else {
			// Broke the straight
			straightCards = [ card ];
		}
	}
	if (straightCards.length === 5) {
		// See if our straight can be upgraded to a straight flush
		let currentHighIndex, currentSuit, currentSuitCount = 0;
		for (let i = 0; i < straightCards.length; i++) {
			let straightCard = straightCards[i];
			if (typeof currentHighIndex !== 'number' || straightCard.suit !== currentSuit) {
				currentHighIndex = i;
				currentSuitCount = 1;
				currentSuit = straightCard.suit;
			} else {
				currentSuitCount++;
				if (currentSuitCount === 5) break;
			}
		}
		if (currentSuitCount === 5) {
			// Straight flush! Return result
			return {
				type: 'straight-flush',
				suit: currentSuit,
				highValue: straightCards[currentHighIndex].value,
				cards: straightCards.slice(currentHighIndex, 5).map((components) => components.card)
			};
		}
	}


	// First determine if we have a flush
	let flushes;
	let currentSuit;
	let currentSuitCount;
	let currentCards;
	for (let card of handComponentsBySuit) {
		if (!currentCards) {
			currentCards = [];
			currentSuit = card.suit;
		}
	}
}



module.exports = {
	validateCard,
	getCardComponents,
	getCardString,
	getUnshuffledDeck,
	getShuffledDeck,
	getHandResult
};
