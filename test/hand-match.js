'use strict';
const XError = require('xerror');
const expect = require('chai').expect;
const cardUtils = require('../lib/card-utils');
const getCardComponentsFromString = cardUtils.getCardComponentsFromString;
const getValueFromString = cardUtils.getValueFromString;
const getSuitFromString = cardUtils.getSuitFromString;
const handEval = require('../lib/hand-eval');
const getFullEvaluation = handEval.getFullEvaluation;
const handMatch = require('../lib/hand-match');
const normalizeFullEval = handMatch.normalizeFullEval;
const getNormalizedEvalQuery = handMatch.getNormalizedEvalQuery;
const processPokerRoundMatches = handMatch.processPokerRoundMatches;
const PokerTable = require('../lib/poker-table');

function makeHand(strArr) {
	return strArr.map((str) => {
		if (typeof str === 'number') return str;
		return getCardComponentsFromString(str).cardId;
	});
}

describe('handMatch', function() {

	describe('#normalizeFullEval', function() {

		it('should remove unwanted fields from eval object', function() {
			let fullEval = getFullEvaluation(
				makeHand([ 'Qc', 'Qs' ]),
				makeHand([ '2s', '5s', '8s' ])
			);
			expect(fullEval.pocket[0].cardId).to.exist;
			let normalizedEval = normalizeFullEval(fullEval);
			expect(normalizedEval.pocket[0].cardId).to.not.exist;
		});

	});

	describe('#getNormalizedEvalQuery', function() {

		it('should replace stringified values with correct values', function() {
			let queryData = {
				$and: [ {
					pocket: {
						$elemMatch: { value: { $gte: 'King' } }
					}
				}, {
					pocket: 'Kh'
				}, {
					'pocket.$': 'Qh'
				}, {
					'community.suit': 'Spades'
				} ]
			};
			let query = getNormalizedEvalQuery(queryData);
			expect(query.getData()).to.deep.equal({
				$and: [ {
					pocket: {
						$elemMatch: {
							value: { $gte: getValueFromString('K') }
						}
					}
				}, {
					pocket: {
						value: getValueFromString('K'),
						suit: getSuitFromString('h')
					}
				}, {
					'pocket.$': {
						value: getValueFromString('Q'),
						suit: getSuitFromString('h')
					}
				}, {
					'community.suit': getSuitFromString('s')
				} ]
			});
		});

		it('should fail on invalid string', function() {
			let queryData = { 'pocket.suit': 'A Spade' };
			expect(function() {
				return getNormalizedEvalQuery(queryData);
			}).to.throw(XError);
		});

	});

	describe('#processPokerRoundMatches', function() {

		it('should correctly match eval objects', function() {
			let table = new PokerTable(2);
			let stackedDeckFunc = table.createStackedDeckFunc({
				0: [ 2, 3 ],
				community: [ 8, 9, 25 ]
			});
			let round = table.playRound(stackedDeckFunc());
			let goodMatch = {
				roundPart: 'flop',
				query: {
					'resultEval.evaluations': {
						$elemMatch: {
							evalType: 'flush-draw',
							remainingCards: 1
						}
					}
				}
			};
			let badMatch = {
				roundPart: 'flop',
				query: {
					'resultEval.result.evalType': 'flush'
				}
			};
			expect(processPokerRoundMatches(round, goodMatch)).to.equal(true);
			expect(processPokerRoundMatches(round, badMatch)).to.equal(false);
		});

	});

});
