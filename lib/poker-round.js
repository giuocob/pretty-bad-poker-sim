/*
Class representing a single round of poker played at a table. A shuffled deck is created
during construction, and the class provides accessor methods to get players' hands and results.
*/

'use strict';
const XError = require('xerror');
const handEval = require('./hand-eval');

class PokerRound {

	constructor(pokerTable, deck) {
		this.pokerTable = pokerTable;
		this.numPlayers = pokerTable.numPlayers;
		this.deck = deck;
	}

	// Get the pocket cards for a player. Default value is 0 (the protagonist).
	getPocketCards(playerIndex) {
		if (!playerIndex) playerIndex = 0;
		if (playerIndex < 0 || playerIndex >= this.numPlayers) {
			throw new XError(XError.INVALID_ARGUMENT, 'Player index is out of bounds');
		}
		return this.deck.slice(2 * playerIndex, 2 * playerIndex + 2);
	}

	// Get the community cards available at a roundPart. Defaults to 'river'.
	getCommunityCards(roundPart) {
		if (!roundPart || roundPart === 'river') {
			return this.deck.slice(2 * this.numPlayers, 2 * this.numPlayers + 5);
		} else if (roundPart === 'turn') {
			return this.deck.slice(2 * this.numPlayers, 2 * this.numPlayers + 4);
		} else if (roundPart === 'flop') {
			return this.deck.slice(2 * this.numPlayers, 2 * this.numPlayers + 3);
		} else if (roundPart === 'preflop') {
			return [];
		} else {
			throw new XError(XError.INVALID_ARGUMENT, 'Invalid roundPart: ' + roundPart);
		}
	}

	// Get an array of all cards available to a player at a specific point in the round.
	// Allowed values: 'preflop', 'flop', 'turn', 'river' (default)
	getPlayerAvailableCards(playerIndex, roundPart) {
		let pocketCards = this.getPocketCards(playerIndex);
		let communityCards = this.getCommunityCards(roundPart);
		return pocketCards.concat(communityCards);
	}

	// Get the hand result for a given player after all cards are dealt.
	getPlayerHandResult(playerIndex) {
		let cards = this.getPlayerAvailableCards(playerIndex, 'river');
		return handEval.getHandResult(cards);
	}

	// Get an array of all players who won or tied for the win for this round.
	// Returns array of player indexes in ascending value.
	getWinningPlayers() {
		let currentWinners;
		let currentBestResult;
		for (let i = 0; i < this.numPlayers; i++) {
			let playerResult = handEval.getHandResult(this.getPlayerAvailableCards(i));
			if (!currentBestResult) {
				currentBestResult = playerResult;
				currentWinners = [ i ];
			} else {
				let comp = handEval.compareHandResults(playerResult, currentBestResult);
				if (comp < 0) {
					// New hand is best
					currentBestResult = playerResult;
					currentWinners = [ i ];
				} else if (comp > 0) {
					// Current hand is best
					continue;
				} else {
					// Tie with current hand
					currentWinners.push(i);
				}
			}
		}
		return currentWinners;
	}

}

module.exports = PokerRound;
