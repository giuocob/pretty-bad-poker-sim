// Utilities for classifying and manipulating the deck of poker cards, the players' hands,
// and the community cards.

'use strict';
const XError = require('xerror');
const randomUtils = require('./random-utils');

/*
Deck of poker cards is represented by a shuffled array of the integers 1 - 52.
The value of a card is its remained when divided by 13, and its suit is the quotient of (value - 1).

NUMBERS (remainder)
1: Ace
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
0: King

SUITS (quotient)
0: Clubs
1: Diamonds
2: Hearts
3: Spades
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
	return {
		card: card,
		value: card % 13,
		suit: Math.floor((card - 1) / 13)
	};
}

// Get a human-readable string for a card's value
let strValueMap = {
	1: { short: 'A', long: 'Ace' },
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
	0: { short: 'K', long: 'King' }
};

let strSuitMap = {
	0: { short: 'c', long: 'Clubs' },
	1: { short: 'd', long: 'Diamonds' },
	2: { short: 'h', long: 'Hearts' },
	3: { short: 's', long: 'Spades' }
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


module.exports = {
	validateCard,
	getCardComponents,
	getCardString,
	getUnshuffledDeck,
	getShuffledDeck
};
