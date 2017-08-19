/*
Container class for a table of 1-10 players. Provides methods for running poker rounds.
Players are assigned an index starting a 0, with player 0 being the "protagonist".
*/

'use strict';
const XError = require('xerror');
const PokerRound = require('./poker-round');

class PokerTable {

	// rng is optional
	constructor(numPlayers, rng) {
		if (numPlayers < 1 || numPlayers > 10) {
			throw new XError(XError.INVALID_ARGUMENT, 'numPlayers is out of bounds');
		}
		this.numPlayers = numPlayers;
		this.rng = rng;
		this.currentRound = null;
	}

	// Construct and return a PokerRound object for this table.
	playRound() {
		let round = new PokerRound(this);
		this.currentRound = round;
		return round;
	}

};

module.exports = PokerTable;