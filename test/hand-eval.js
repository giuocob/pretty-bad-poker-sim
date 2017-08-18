'use strict';
const XError = require('xerror');
const expect = require('chai').expect;
const cardUtils = require('../lib/card-utils');
const getCardComponentsFromString = cardUtils.getCardComponentsFromString;
const getValueFromString = cardUtils.getValueFromString;
const getSuitFromString = cardUtils.getSuitFromString;
const handEval = require('../lib/hand-eval');
const getHandResult = handEval.getHandResult;

function makeHand(strArr) {
	return strArr.map((str) => {
		if (typeof str === 'number') return str;
		return getCardComponentsFromString(str).cardId;
	});
}

function checkHandResult(actual, expected) {
	expect(actual).to.exist;
	for (let key in expected) {
		if (key === 'cardIds' || key === 'hand') {
			expect(actual.cardIds).to.exist;
			if (key === 'hand') {
				expected.cardIds = makeHand(expected.hand);
			}
			expect(expected.cardIds.length).to.equal(actual.cardIds.length);
			for (let cardId of expected.cardIds) {
				expect(actual.cardIds).to.include(cardId);
			}
		} else {
			expect(expected[key]).to.equal(actual[key]);
		}
	}
}

describe('handEval', function() {

	describe('#getHandResult', function() {

		it('should do input sanity checking', function() {
			expect(() => {
				return getHandResult(makeHand(
					[ 'As', '2s', '3s', '4s', '5s', 'NICECARDBRO' ]
				));
			}).to.throw(XError);
			expect(() => {
				return getHandResult(makeHand(
					[ 'As', '2s', '3s', '4s' ]
				));
			}).to.throw(XError);
			expect(() => {
				return getHandResult(makeHand(
					[ 'As', '2s', '3s', '4s', '5s', '6s', '7s', '8s' ]
				));
			}).to.throw(XError);
		});

		it('should detect a straight flush', function() {
			checkHandResult(
				getHandResult(makeHand([ 'Jc', 'Ts', 'Kc', 'Qc', '9c', '2c', 'Tc' ])),
				{
					type: 'straight-flush',
					suit: getSuitFromString('c'),
					hand: [ 'Kc', 'Qc', 'Jc', 'Tc', '9c' ]
				}
			);
			checkHandResult(
				getHandResult(makeHand([ 'Js', '7s', '6s', '8s', '5s', '4s', '3s' ])),
				{
					type: 'straight-flush',
					suit: getSuitFromString('s'),
					hand: [ '8s', '7s', '6s', '5s', '4s' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Js', '7s', '6s', '8s', '5d', '4s', '3s' ])).type
			).to.not.equal('straight-flush');
		});

	});

});
