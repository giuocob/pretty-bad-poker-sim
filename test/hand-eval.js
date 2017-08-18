'use strict';
const XError = require('xerror');
const expect = require('chai').expect;
const cardUtils = require('../lib/card-utils');
const getCardComponentsFromString = cardUtils.getCardComponentsFromString;
const getValueFromString = cardUtils.getValueFromString;
const getSuitFromString = cardUtils.getSuitFromString;
const handEval = require('../lib/hand-eval');
const getHandResult = handEval.getHandResult;
const compareHandResults = handEval.compareHandResults;

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
			expect(expected[key]).to.deep.equal(actual[key]);
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
			expect(() => {
				return getHandResult(makeHand(
					[ 'As', '2s', '3s', '4s', '5s', '6s', '3s' ]
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

		it('should detect a four-of-a-kind', function() {
			checkHandResult(
				getHandResult(makeHand([ 'Qc', 'Qd', '5s', '5c', 'Qs', 'Qh', '3c' ])),
				{
					type: 'four-of-a-kind',
					value: getValueFromString('Q'),
					kickerValues: [ getValueFromString('5') ],
					hand: [ 'Qc', 'Qd', 'Qs', 'Qh', '5s' ]
				}
			);
		});

		it('should detect a full house', function() {
			checkHandResult(
				getHandResult(makeHand([ 'Jh', 'Jd', 'Jc', '8c', '8s', 'Ad', 'Ah' ])),
				{
					type: 'full-house',
					threeValue: getValueFromString('J'),
					twoValue: getValueFromString('A'),
					hand: [ 'Jh', 'Jd', 'Jc', 'Ad', 'Ah' ]
				}
			);
		});

		it('should detect a flush', function() {
			checkHandResult(
				getHandResult(makeHand([ 'Kc', '8c', 'As', '6c', 'Qc', '4c', '2c' ])),
				{
					type: 'flush',
					suit: getSuitFromString('c'),
					kickerValues: [
						getValueFromString('K'),
						getValueFromString('Q'),
						getValueFromString('8'),
						getValueFromString('6'),
						getValueFromString('4')
					],
					hand: [ 'Kc', 'Qc', '8c', '6c', '4c' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Tc', '8h', '7c', '6c', '5c', '4c', '3c' ])).type
			).to.not.equal('flush');
		});

		it('should detect a straight', function() {
			checkHandResult(
				getHandResult(makeHand([ 'Ac', 'Kc', 'Qd', '4s', 'Ts', 'Jh' ])),
				{
					type: 'straight',
					highValue: getValueFromString('A'),
					hand: [ 'Ac', 'Kc', 'Qd', 'Jh', 'Ts' ]
				}
			);
			checkHandResult(
				getHandResult(makeHand([ 'Ad', '4s', 'As', '2h', 'Kh', '3c', '5c' ])),
				{
					type: 'straight',
					highValue: getValueFromString('5'),
					hand: [ '5c', '4s', '3c', '2h', 'As' ]
				}
			);
			checkHandResult(
				getHandResult(makeHand([ '3s', '4s', '5h', '6h', '7c', '8h', '9s' ])),
				{
					type: 'straight',
					highValue: getValueFromString('9'),
					hand: [ '9s', '8h', '7c', '6h', '5h' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Jh', 'Td', '9s', '6s', '3s' ])).type
			).to.not.equal('straight');
		});

		it('should detect a three-of-a-kind', function() {
			checkHandResult(
				getHandResult(makeHand([ '4c', '5h', '5s', '6c', '9h', '5d', 'Kc' ])),
				{
					type: 'three-of-a-kind',
					value: getValueFromString('5'),
					kickerValues: [ getValueFromString('K'), getValueFromString('9') ],
					hand: [ '5h', '5s', '5d', 'Kc', '9h' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Kd', 'Qd', '5c', 'Kh' ])).type
			).to.not.equal('three-of-a-kind');
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Kd', 'Kh', 'Kc', '2c', '4d' ])).type
			).to.not.equal('three-of-a-kind');
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Kd', 'Kh', 'Jc', 'Th', '9d' ])).type
			).to.not.equal('three-of-a-kind');
		});

		it('should detect a two-pair', function() {
			checkHandResult(
				getHandResult(makeHand([ '4c', '5h', '5s', '6c', '4h', 'As', 'Kc' ])),
				{
					type: 'two-pair',
					values: [ getValueFromString('5'), getValueFromString('4') ],
					kickerValues: [ getValueFromString('A') ],
					hand: [ '5h', '5s', '4h', '4c', 'As' ]
				}
			);
			checkHandResult(
				getHandResult(makeHand([ '4c', '5h', '5s', '2c', '4h', 'As', 'Ac' ])),
				{
					type: 'two-pair',
					values: [ getValueFromString('A'), getValueFromString('5') ],
					kickerValues: [ getValueFromString('4') ],
					hand: [ 'As', 'Ac', '5s', '5h', '4h' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Kd', 'Qd', 'Kh' ])).type
			).to.not.equal('two-pair');
		});

		it('should detect a pair', function() {
			checkHandResult(
				getHandResult(makeHand([ '4c', '5h', '5s', '6c', 'Th', 'Ad', 'Kc' ])),
				{
					type: 'pair',
					value: getValueFromString('5'),
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('K'),
						getValueFromString('T')
					],
					hand: [ '5h', '5s', 'Ad', 'Kc', 'Th' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Ks', 'Qs', 'Kd', 'Qd', '5c', 'Jh' ])).type
			).to.not.equal('pair');
		});

		it('should calculate a high-cards result if no other result is present', function() {
			checkHandResult(
				getHandResult(makeHand([ '4c', '5h', 'Qs', '6c', 'Th', 'Ad', 'Jc' ])),
				{
					type: 'high-cards',
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('Q'),
						getValueFromString('J'),
						getValueFromString('T'),
						getValueFromString('6')
					],
					hand: [ 'Ad', 'Qs', 'Jc', 'Th', '6c' ]
				}
			);
		});

	});

	describe('#compareHandResults', function() {

		const HR = {
			'royal-flush': getHandResult(makeHand([ 'Ah', 'Kh', 'Qh', 'Jh', 'Th' ])),
			'straight-flush-1': getHandResult(makeHand([ '9h', '8h', '7h', '6h', '5h' ])),
			'straight-flush-2': getHandResult(makeHand([ '9s', '8s', '7s', '6s', '5s' ])),
			'4oak-j-1': getHandResult(makeHand([ 'Js', 'Jh', 'Jd', 'Jc', 'Ah' ])),
			'4oak-j-2': getHandResult(makeHand([ 'Js', 'Jh', 'Jd', 'Jc', 'Ac' ])),
			'4oak-j-3': getHandResult(makeHand([ 'Js', 'Jh', 'Jd', 'Jc', '7c' ])),
			'4oak-3': getHandResult(makeHand([ '3s', '3h', '3d', '3c', 'Ad' ])),
		};

		it('should always prefer hand with stronger result', function() {
			expect(compareHandResults(HR['royal-flush'], HR['4oak-j-1'])).to.equal(-1);
			expect(compareHandResults(HR['4oak-j-1'], HR['straight-flush-1'])).to.equal(1);
		});

		it('should always return 0 when comparing a hand to itself', function() {
			for (let handName in HR) {
				expect(compareHandResults(HR[handName], HR[handName])).to.equal(0);
			}
		});

		it('should correctly compare straight flushes', function() {
			expect(compareHandResults(HR['royal-flush'], HR['straight-flush-1'])).to.equal(-1);
			expect(compareHandResults(HR['straight-flush-1'], HR['straight-flush-2'])).to.equal(0);
		});

		it('should correctly compare four-of-a-kind', function() {
			expect(compareHandResults(HR['4oak-j-1'], HR['4oak-j-2'])).to.equal(0);
			expect(compareHandResults(HR['4oak-j-1'], HR['4oak-j-3'])).to.equal(-1);
			expect(compareHandResults(HR['4oak-3'], HR['4oak-j-3'])).to.equal(1);
		});

	});

});
