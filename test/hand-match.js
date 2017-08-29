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
				0: [ '2s', '3s' ],
				community: [ '7s', '8s', 'Kh' ]
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

		it('should support $minStrength and $maxStrength', function() {
			let table = new PokerTable(1);
			let stackedDeckFunc = table.createStackedDeckFunc({
				0: [ 'Ks', '5c' ],
				community: [ 'Ah', 'Kh', '5h' ]
			});
			let round = table.playRound(stackedDeckFunc());

			let pairOrBetter = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$minStrength: { evalType: 'pair' }
					}
				}
			};
			expect(processPokerRoundMatches(round, pairOrBetter)).to.equal(true);

			let pairOrWorse = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$maxStrength: { evalType: 'pair' }
					}
				}
			};
			expect(processPokerRoundMatches(round, pairOrWorse)).to.equal(false);

			let straightOrBetter = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$minStrength: { evalType: 'straight' }
					}
				}
			};
			expect(processPokerRoundMatches(round, straightOrBetter)).to.equal(false);

			let straightOrWorse = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$maxStrength: { evalType: 'straight' }
					}
				}
			};
			expect(processPokerRoundMatches(round, straightOrWorse)).to.equal(true);

			let twoPairOrBetter = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$minStrength: { evalType: 'two-pair' }
					}
				}
			};
			expect(processPokerRoundMatches(round, twoPairOrBetter)).to.equal(true);

			let twoPairOrWorse = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$maxStrength: { evalType: 'two-pair' }
					}
				}
			};
			expect(processPokerRoundMatches(round, twoPairOrWorse)).to.equal(true);

			let weakTwoPairOrBetter = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$minStrength: { evalType: 'two-pair', values: [ cardUtils.JACK ] }
					}
				}
			};
			expect(processPokerRoundMatches(round, weakTwoPairOrBetter)).to.equal(true);

			let weakTwoPairOrWorse = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$maxStrength: { evalType: 'two-pair', values: [ cardUtils.JACK ] }
					}
				}
			};
			expect(processPokerRoundMatches(round, weakTwoPairOrWorse)).to.equal(false);

			let strongTwoPairOrBetter = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$minStrength: { evalType: 'two-pair', values: [ cardUtils.ACE ] }
					}
				}
			};
			expect(processPokerRoundMatches(round, strongTwoPairOrBetter)).to.equal(false);

			let strongTwoPairOrWorse = {
				roundPart: 'flop',
				query: {
					'resultEval.result': {
						$maxStrength: { evalType: 'two-pair', values: [ cardUtils.ACE ] }
					}
				}
			};
			expect(processPokerRoundMatches(round, strongTwoPairOrWorse)).to.equal(true);

		});

	});

});
