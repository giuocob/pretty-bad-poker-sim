/*
Container class for a table of 1-10 players. Provides methods for running poker rounds.
Players are assigned an index starting a 0, with player 0 being the "protagonist".
*/

'use strict';
const XError = require('xerror');
const PokerRound = require('./poker-round');
const cardUtils = require('./card-utils');
const randomUtils = require('./random-utils');

class PokerTable {

	// rng is optional
	constructor(numPlayers, rng) {
		if (!rng) rng = randomUtils.defaultRng;
		if (numPlayers < 1 || numPlayers > 10) {
			throw new XError(XError.INVALID_ARGUMENT, 'numPlayers is out of bounds');
		}
		this.numPlayers = numPlayers;
		this.rng = rng;
		this.currentRound = null;
	}

	// Construct and return a PokerRound object for this table.
	playRound(deck) {
		if (!deck) deck = cardUtils.getShuffledDeck(this.rng);
		let round = new PokerRound(this, deck);
		this.currentRound = round;
		return round;
	}

	// Returns a function that creates a stacked deck with the given config in the form:
	// { '0': [ 'Kh', 'Ks' ], community: [ '4h', '4s', '5c' ] }
	createStackedDeckFunc(config) {
		let rawStacks = {};
		for (let indexStr in config) {
			let stackIndex;
			if (indexStr === 'community') {
				stackIndex = 2 * this.numPlayers;
			} else {
				stackIndex = 2 * parseInt(indexStr, 10);
				if (stackIndex >= this.numPlayers) {
					throw new XError(XError.INVALID_ARGUMENT, 'playerIndex is out of bounds');
				}
			}
			let cardIds = config[indexStr].map((cardStr) => {
				if (typeof cardStr === 'number') {
					// Assume it's a cardId
					return cardStr;
				} else if (typeof cardStr === 'object' && cardStr.cardId) {
					// Assume card components
					return cardStr.cardId;
				} else if (typeof cardStr === 'string') {
					// Assume card string
					let components = cardUtils.getCardComponentsFromString(cardStr);
					return components.cardId;
				} else {
					throw new XError(XError.INVALID_ARGUMENT, 'Could not get cardId');
				}
			});
			rawStacks[stackIndex] = cardIds;
		}
		return () => {
			return cardUtils.getPartiallyStackedDeck(rawStacks, this.rng);
		}
	}

};

module.exports = PokerTable;
