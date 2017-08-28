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

});
