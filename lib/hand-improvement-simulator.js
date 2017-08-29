// Simulator that determines the probability of one type of hand improving to another.

'use strict';
const XError = require('xerror');
const Simulator = require('./simulator');
const PokerTable = require('./poker-table');
const handMatch = require('./hand-match');

class HandImprovementSimulator extends Simulator {

	constructor(relevanceMatch, acceptanceMatch, trials, trialAttempts, progressFunc) {
		let pokerTable = new PokerTable(1);
		super(pokerTable, trials, trialAttempts);
		if (!acceptanceMatch) {
			throw new XError(XError.INVALID_ARGUMENT, 'Acceptance match is required');
		}
		this.relevanceMatch = handMatch.normalizePokerRoundMatches(relevanceMatch);
		this.acceptanceMatch = handMatch.normalizePokerRoundMatches(acceptanceMatch);
		this.progressFunc = progressFunc;
		this.totalTested = 0;
		this.totalAccepted = 0;
	}

	_isPokerRoundRelevant(pokerRound) {
		if (!this.relevanceMatch) return true;
		return handMatch.processPokerRoundMatches(pokerRound, this.relevanceMatch, true);
	}

	_processPokerRound(pokerRound) {
		this.totalTested++;
		if (handMatch.processPokerRoundMatches(pokerRound, this.acceptanceMatch, true)) {
			this.totalAccepted++;
		}
	}

	_progress(data) {
		if (this.progressFunc) {
			this.progressFunc(data);
		}
	}

	_getResult() {
		return {
			improveProb: (this.totalTested !== 0) ? (this.totalAccepted / this.totalTested) : 0
		};
	}

}

module.exports = HandImprovementSimulator;
