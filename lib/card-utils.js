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

// Get the card components for each cardId in an array.
function getCardComponentsArray(cardIdArray) {
	return cardIdArray.map((cardId) => getCardComponents(cardId));
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

// Mathematical requirements for constants: all numerical values are integers greater than 0, and the card values
// are contiguous integers ranging from ACE_LOW to ACE_HIGH. The canonical value of ACE is ACE_HIGH.
const vals = {
	ACE_LOW: 1,
	TWO: 2,
	THREE: 3,
	FOUR: 4,
	FIVE: 5,
	SIX: 6,
	SEVEN: 7,
	EIGHT: 8,
	NINE: 9,
	TEN: 10,
	JACK: 11,
	QUEEN: 12,
	KING: 13,
	ACE: 14,
	ACE_HIGH: 14,
	CLUB: 1,
	CLUBS: 1,
	DIAMOND: 2,
	DIAMONDS: 2,
	HEART: 3,
	HEARTS: 3,
	SPADE: 4,
	SPADES: 4
};

// Get a human-readable string for a card's value
let valueStrMap = {
	[vals.TWO]: { short: '2', long: 'Two' },
	[vals.THREE]: { short: '3', long: 'Three' },
	[vals.FOUR]: { short: '4', long: 'Four' },
	[vals.FIVE]: { short: '5', long: 'Five' },
	[vals.SIX]: { short: '6', long: 'Six' },
	[vals.SEVEN]: { short: '7', long: 'Seven' },
	[vals.EIGHT]: { short: '8', long: 'Eight' },
	[vals.NINE]: { short: '9', long: 'Nine' },
	[vals.TEN]: { short: 'T', long: 'Ten' },
	[vals.JACK]: { short: 'J', long: 'Jack' },
	[vals.QUEEN]: { short: 'Q', long: 'Queen' },
	[vals.KING]: { short: 'K', long: 'King' },
	[vals.ACE]: { short: 'A', long: 'Ace' }
};
let strValueMap = {};
for (let key in valueStrMap) {
	strValueMap[valueStrMap[key].short.toLowerCase()] = parseInt(key, 10);
	strValueMap[valueStrMap[key].long.toLowerCase()] = parseInt(key, 10);
}

let suitStrMap = {
	[vals.CLUBS]: { short: 'c', long: 'Clubs', longSing: 'Club' },
	[vals.DIAMONDS]: { short: 'd', long: 'Diamonds', longSing: 'Diamond' },
	[vals.HEARTS]: { short: 'h', long: 'Hearts', longSing: 'Heart' },
	[vals.SPADES]: { short: 's', long: 'Spades', longSing: 'Spade' }
};
let strSuitMap = {};
for (let key in suitStrMap) {
	strSuitMap[suitStrMap[key].short.toLowerCase()] = parseInt(key, 10);
	strSuitMap[suitStrMap[key].long.toLowerCase()] = parseInt(key, 10);
	strSuitMap[suitStrMap[key].longSing.toLowerCase()] = parseInt(key, 10);
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

// Sections is a map of array indices to arrays of cards that should occur there.
// For example, { 2: [ 30, 40 ] } will put cardIds 30 and 40 and indexes 2 and 3 respectively
// Causes unexpected behavior if stack regions overlap, e.g. don't do { 10: [ 15, 16 ], 11: [ 26, 27 ] }
function getPartiallyStackedDeck(sections, rng) {
	let sectionsArray = [];
	let cardsToStack = {};
	for (let stackIndex in sections) {
		if (!Array.isArray(sections[stackIndex])) {
			sections[stackIndex] = [ sections[stackIndex] ];
		}
		for (let cardId of sections[stackIndex]) {
			if (cardsToStack[cardId]) {
				throw new XError(XError.INVALID_ARGUMENT, 'Attempted to stack same cardId twice');
			}
			cardsToStack[cardId] = true;
		}
		sectionsArray.push({ index: parseInt(stackIndex, 10), cards: sections[stackIndex] });
	}
	sectionsArray.sort(function(a, b) {
		if (a.index < b.index) return -1;
		if (a.index > b.index) return 1;
		return 0;
	});

	// Get shuffled array of all unstacked cards
	let deck = [];
	for (let i = 1; i <= 52; i++) {
		if (!cardsToStack[i]) deck.push(i);
	}
	deck = randomUtils.shuffleArray(deck, rng);
	// Splice in stacked parts
	for (let section of sectionsArray) {
		deck = deck.slice(0, section.index)
			.concat(section.cards)
			.concat(deck.slice(section.index));
	}
	return deck;
}



module.exports = {
	validateCard,
	getCardComponents,
	getCardComponentsArray,
	getCardIdFromComponents,
	getCardString,
	getValueString,
	getSuitString,
	getCardComponentsFromString,
	getValueFromString,
	getSuitFromString,
	getUnshuffledDeck,
	getShuffledDeck,
	getPartiallyStackedDeck
};
for (let val in vals) {
	module.exports[val] = vals[val];
}
