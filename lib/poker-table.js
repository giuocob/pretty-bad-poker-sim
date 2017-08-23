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

};

module.exports = PokerTable;