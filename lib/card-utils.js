// Utilities for identifying individual cards by ID, components, or string.

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

function validateCard(cardId) {
	if (typeof cardId !== 'number') throw new XError(XError.INVALID_ARGUMENT, 'CardId must be a number');
	if (cardId % 1 !== 0) throw new XError(XError.INVALID_ARGUMENT, 'CardId must be an integer');
	if (cardId < 1 || cardId > 52) throw new XError(XError.INVALID_ARGUMENT, 'CardId is out of bounds');
}

// Return the suit and value of a card. As a convenience, is a no-op if the object is already a card components object.
function getCardComponents(cardId) {
	if (
		cardId &&
		typeof cardId === 'object' &&
		typeof cardId.cardId === 'number' &&
		typeof cardId.value === 'number' &&
		typeof cardId.suit === 'number'
	) {
		return cardId;
	}
	validateCard(cardId);
	let value = (cardId % 13) + 1
	if (value === 1) value = 14;
	let suit = Math.floor((cardId - 1) / 13) + 1;
	return {
		cardId: cardId,
		value: value,
		suit: suit
	};
}

// Inverse operation of getCardComponents. Takes a value and suit.
function getCardIdFromComponents(value, suit) {
	if (value % 1 !== 0) throw new XError(XError.INVALID_ARGUMENT, 'Value must be an integer');
	if (value < 2 || value > 14) throw new XError(XError.INVALID_ARGUMENT, 'Value is out of bounds');
	if (suit % 1 !== 0) throw new XError(XError.INVALID_ARGUMENT, 'Suit must be an integer');
	if (suit < 1 || suit > 4) throw new XError(XError.INVALID_ARGUMENT, 'Suit is out of bounds');
	let suitVal = (suit - 1) * 13;
	let valueVal = value - 1;
	return suitVal + valueVal;
}

// Get a human-readable string for a card's value
let valueStrMap = {
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
let strValueMap = {};
for (let key in valueStrMap) {
	strValueMap[valueStrMap[key].short.toLowerCase()] = parseInt(key, 10);
	strValueMap[valueStrMap[key].long.toLowerCase()] = parseInt(key, 10);
}

let suitStrMap = {
	1: { short: 'c', long: 'Clubs' },
	2: { short: 'd', long: 'Diamonds' },
	3: { short: 'h', long: 'Hearts' },
	4: { short: 's', long: 'Spades' }
};
let strSuitMap = {};
for (let key in suitStrMap) {
	strSuitMap[suitStrMap[key].short.toLowerCase()] = parseInt(key, 10);
	strSuitMap[suitStrMap[key].long.toLowerCase()] = parseInt(key, 10);
}

function getCardString(card, longhand) {
	let components = getCardComponents(card);
	let valueObj = valueStrMap[components.value];
	let suitObj = suitStrMap[components.suit];
	if (longhand) {
		return `${valueObj && valueObj.long || 'NULL'} of ${suitObj && suitObj.long || 'NULL'}`;
	} else {
		return `${valueObj && valueObj.short || 'NULL'}${suitObj && suitObj.short || 'NULL'}`;
	}
}

function getValueString(value, longhand) {
	let valueObj = valueStrMap[value];
	if (longhand) {
		return valueObj && valueObj.long || 'NULL';
	} else {
		return valueObj && valueObj.short || 'NULL';
	}
}

function getSuitString(suit, longhand) {
	let suitObj = suitStrMap[suit];
	if (longhand) {
		return suitObj && suitObj.long || 'NULL';
	} else {
		return suitObj && suitObj.short || 'NULL';
	}
}

// Given shorthand input string, get the cardComponenets object for it.
function getCardComponentsFromString(str) {
	if (str.length !== 2) {
		throw new XError(
			XError.INVALID_ARGUMENT, 
			'Card string should be in two-character poker notation (e.g. Jh = Jack of Hearts")'
		);
	}
	let value = getValueFromString(str[0]);
	let suit = getSuitFromString(str[1]);
	return {
		cardId: getCardIdFromComponents(value, suit),
		value: value,
		suit: suit
	};
}

function getValueFromString(str) {
	let value = strValueMap[str.toLowerCase()];
	if (!value) throw new XError(XError.INVALID_ARGUMENT, 'Unrecognized value string: ' + str);
	return value;
}

function getSuitFromString(str) {
	let suit = strSuitMap[str.toLowerCase()];
	if (!suit) throw new XError(XError.INVALID_ARGUMENT, 'Unrecognized suit string: ' + str);
	return suit;
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
	getCardIdFromComponents,
	getCardString,
	getValueString,
	getSuitString,
	getCardComponentsFromString,
	getValueFromString,
	getSuitFromString,
	getUnshuffledDeck,
	getShuffledDeck
};
