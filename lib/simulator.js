// Base class for all poker simulators.

'use strict';
const XError = require('xerror');
const cardUtils = require('./card-utils');
const pasync = require('pasync');

const NORMAL_ROUNDS_PER_CYCLE = 100;
const HIGH_ROUNDS_PER_CYCLE = 500;

class Simulator {

	constructor(pokerTable, trials, trialAttempts, cpuHog) {
		this.pokerTable = pokerTable;
		this.rng = pokerTable.rng;
		this.trials = trials;
		if (typeof trials !== 'number' || trials < 1) {
			throw new XError(XError.INVALID_ARGUMENT, 'Trials is required');
		}
		this.trialAttempts = trialAttempts || trials;
		if (cpuHog) {
			this.roundsPerCycle = HIGH_ROUNDS_PER_CYCLE;
		} else {
			this.roundsPerCycle = NORMAL_ROUNDS_PER_CYCLE;
		}
		this.running = false;
		this.hasRun = false;
	}

	/*
	Get a deck to use for a round of simulation. By default this returns a shuffled deck, but
	it can be overriden if needed to stack the deck.
	*/
	_getDeck(roundContext) {
		return cardUtils.getShuffledDeck(this.rng);
	}

	/*
	Returns true if the given pokerRound meets the requirements for this simulation, and false otherwise.
	*/
	_isPokerRoundRelevant(pokerRound, roundContext) {
		return true;
	}

	/*
	Perform the analytics needed by this simulation.
	*/
	_processPokerRound(pokerRound, roundContext) {
		throw new XError(XError.INTERNAL_ERROR, 'Unimplemented');
	}

	/*
	Return the result of this simulation. Only called when the simulator has run to completion.
	*/
	_getResult() {
		return null;
	}

	/*
	Called once per cycle with the current count of trials and trial attempts. Use this for progress reporting.
	*/
	_progress(data) {
		// Empty by default
	}

	run() {
		if (this.running) throw new XError(XError.INTERNAL_ERROR, 'Simulator is already running');
		if (this.hasRun) throw new XError(XError.INTERNAL_ERROR, 'Simulator has already run');
		this.running = true;
		let trialCount = 0;
		let trialAttemptCount = 0;
		let finished = false;
		let beginTimestamp = Date.now();

		return pasync.whilst(() => {
			return !finished;
		}, () => {
			// Run a synchronous inner loop to relinquish the CPU every several rounds
			for (let i = 0; i < this.roundsPerCycle; i++) {
				trialAttemptCount++;
				let roundContext = { trialAttempt: trialAttemptCount };
				let deck = this._getDeck(roundContext);
				let pokerRound = this.pokerTable.playRound(deck);
				if (this._isPokerRoundRelevant(pokerRound, roundContext)) {
					trialCount++;
					roundContext.trial = trialCount;
					this._processPokerRound(pokerRound, roundContext);
				}
				if (
					(trialCount >= this.trials) ||
					(this.trialAttempts && trialAttemptCount >= this.trialAttempts) 
				) {
					finished = true;
					break;
				}
			}
			this._progress({ 
				trials: this.trials,
				trialCount: trialCount,
				trialAttempts: this.trialAttempts,
				trialAttemptCount: trialAttemptCount
			});
			return pasync.setTimeout(0);
		})
			.then(() => {
				this.hasRun = true;
				this.running = false;
				let endTimestamp = Date.now();
				return {
					totalTrials: trialCount,
					totalTrialAttempts: trialAttemptCount,
					time: (endTimestamp - beginTimestamp) / 1000,
					result: this._getResult()
				};
			})
			.catch((err) => {
				this.hasRun = true;
				this.running = false;
				throw err;
			});
	}

}

module.exports = Simulator;
