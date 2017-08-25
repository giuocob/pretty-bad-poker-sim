'use strict';
const XError = require('xerror');
const expect = require('chai').expect;
const cardUtils = require('../lib/card-utils');
const getCardComponentsFromString = cardUtils.getCardComponentsFromString;
const getValueFromString = cardUtils.getValueFromString;
const getSuitFromString = cardUtils.getSuitFromString;
const handEval = require('../lib/hand-eval');
const getHandResult = handEval.getHandResult;
const getEvaluationByType = handEval.getEvaluationByType;
const compareHandResults = handEval.compareHandResults;
const getPocketEvaluation = handEval.getPocketEvaluation;
const getFullEvaluation = handEval.getFullEvaluation;

function makeHand(strArr) {
	return strArr.map((str) => {
		if (typeof str === 'number') return str;
		return getCardComponentsFromString(str).cardId;
	});
}

function checkHandResult(actual, expected) {
	if (expected === null) {
		expect(actual).to.equal(null);
		return;
	}

	function checkEvaluation(actualEval, expectedEval) {
		expect(actualEval).to.exist;
		for (let key in expectedEval) {
			if (key === 'cardIds' || key === 'hand') {
				expect(actualEval.cardIds).to.exist;
				if (key === 'hand') {
					expectedEval.cardIds = makeHand(expectedEval.hand);
				}
				expect(expectedEval.cardIds.length).to.equal(actualEval.cardIds.length);
				for (let cardId of expectedEval.cardIds) {
					expect(actualEval.cardIds).to.include(cardId);
				}
			} else {
				expect(expectedEval[key]).to.deep.equal(actualEval[key]);
			}
		}
	}

	if (expected.result && expected.evaluations) {
		// Full evaluation
		checkEvaluation(actual.result, expected.result);
		expect(actual.evaluations.length).to.equal(expected.evaluations.length);
		for (let i = 0; i < expected.evaluations.length; i++) {
			checkEvaluation(actual.evaluations[i], expected.evaluations[i]);
		}
	} else {
		checkEvaluation(actual, expected);
	}
}

describe('handEval', function() {

	describe('#getPocketValuation', function() {

		it('should do input sanity checking', function() {
			expect(() => {
				return getPocketEvaluation(makeHand(
					[ 'As', 'NICECARDBRO' ]
				));
			}).to.throw(XError);
			expect(() => {
				return getPocketEvaluation(makeHand(
					[ 'As', '2s', '3s', '4s', '5s' ]
				));
			}).to.throw(XError);
			expect(() => {
				return getPocketEvaluation(makeHand(
					[ 'As', 'As' ]
				));
			}).to.throw(XError);
		});

		it('should return correct results', function() {
			checkHandResult(
				getPocketEvaluation(makeHand([ 'Ac', 'As' ])),
				{
					pairValue: cardUtils.ACE,
					inclusiveStraightCount: 0,
					semiInclusiveStraightCount: 2
				}
			);
			checkHandResult(
				getPocketEvaluation(makeHand([ '3c', '3d' ])),
				{
					pairValue: cardUtils.THREE,
					inclusiveStraightCount: 0,
					semiInclusiveStraightCount: 3
				}
			);
			checkHandResult(
				getPocketEvaluation(makeHand([ 'Qh', 'Kh' ])),
				{
					suitedSuit: cardUtils.HEARTS,
					valueSpread: 1,
					inclusiveStraightCount: 2,
					semiInclusiveStraightCount: 1
				}
			);
			checkHandResult(
				getPocketEvaluation(makeHand([ '9h', '6h' ])),
				{
					suitedSuit: cardUtils.HEARTS,
					valueSpread: 3,
					inclusiveStraightCount: 2,
					semiInclusiveStraightCount: 6
				}
			);
			checkHandResult(
				getPocketEvaluation(makeHand([ 'Ah', '2s' ])),
				{
					valueSpread: 1,
					inclusiveStraightCount: 1,
					semiInclusiveStraightCount: 2
				}
			);
			checkHandResult(
				getPocketEvaluation(makeHand([ 'Td', '4c' ])),
				{
					valueSpread: 6,
					inclusiveStraightCount: 0,
					semiInclusiveStraightCount: 9
				}
			);
		});

	});

	describe('#getHandResult, #getEvaluationByType', function() {

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
			expect(() => {
				return getEvaluationByType(makeHand(
					[ 'As', '2s', '3s', '4s', '5s', '6s' ]
				), 'bad-evaluator');
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
			checkHandResult(
				getHandResult(makeHand([ '6s', '9s', '4h', '3h', 'Ah', '5h', '2h' ])),
				{
					type: 'straight-flush',
					suit: getSuitFromString('h'),
					hand: [ '5h', '4h', '3h', '2h', 'Ah' ]
				}
			);
			expect(
				getHandResult(makeHand([ 'Js', '7s', '6s', '8s', '5d', '4s', '3s' ])).type
			).to.not.equal('straight-flush');
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jc', 'Ts', 'Kc', 'Qc', '9c', '2c', 'Tc' ]), 'flush'),
				{
					type: 'flush',
					suit: getSuitFromString('c'),
					hand: [ 'Kc', 'Qc', 'Jc', 'Tc', '9c' ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jc', 'Ts', 'Kc', 'Qc', '9c', '2c', 'Tc' ]), 'straight'),
				{
					type: 'straight',
					highValue: getValueFromString('K'),
					hand: [ 'Kc', 'Qc', 'Jc', 'Ts', '9c' ]
				}
			);
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
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jh', 'Jd', 'Jc', '8c', '8s', 'Ad', 'Js' ]), 'full-house'),
				{
					type: 'full-house',
					threeValue: getValueFromString('J'),
					twoValue: getValueFromString('8'),
					hand: [ 'Js', 'Jh', 'Jd', '8s', '8c' ]
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
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jh', 'Jd', 'Jc', '8c', '8s', 'Ad', 'Js' ]), 'three-of-a-kind'),
				{
					type: 'three-of-a-kind',
					value: getValueFromString('J'),
					hand: [ 'Js', 'Jh', 'Jd', 'Jc', 'Ad' ]
				}
			);
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
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jh', 'Jd', 'Jc', '8c', '8s', 'Ad', 'Js' ]), 'two-pair'),
				{
					type: 'two-pair',
					values: [ getValueFromString('J'), getValueFromString('8') ],
					kickerValues: [ getValueFromString('A') ],
					hand: [ 'Js', 'Jh', '8s', '8c', 'Ad' ]
				}
			);
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
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jh', 'Jd', 'Jc', '8c', '8s', 'Ad', 'Js' ]), 'pair'),
				{
					type: 'pair',
					value: getValueFromString('J'),
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('J'),
						getValueFromString('J'),
					],
					hand: [ 'Js', 'Jh', 'Ad', 'Jd', 'Jc' ]
				}
			);
		});

		it('should calculate a high-cards', function() {
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
			checkHandResult(
				getEvaluationByType(makeHand([ 'Jh', 'Jd', 'Jc', '8c', 'As', 'Ad', 'Js' ]), 'high-cards'),
				{
					type: 'high-cards',
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('A'),
						getValueFromString('J'),
						getValueFromString('J'),
						getValueFromString('J')
					],
					hand: [ 'As', 'Ad', 'Js', 'Jh', 'Jd' ]
				}
			);
		});

		it('should detect a flush draw', function() {
			checkHandResult(
				getEvaluationByType(makeHand([ 'As', '5s', '6d', 'Kd', 'Ks', '2s' ]), 'flush-draw'),
				{
					type: 'flush-draw',
					suit: getSuitFromString('s'),
					remainingCards: 1,
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('K'),
						getValueFromString('5'),
						getValueFromString('2')
					],
					hand: [ 'As', 'Ks', '5s', '2s' ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Ah', '5h', '6d', 'Kd', 'Kh' ]), 'flush-draw'),
				{
					type: 'flush-draw',
					suit: getSuitFromString('h'),
					remainingCards: 2,
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('K'),
						getValueFromString('5')
					],
					hand: [ 'Ah', 'Kh', '5h' ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Ah', '5h', '6h', 'Kd', 'Kh', '3h' ]), 'flush-draw'),
				{
					type: 'flush-draw',
					suit: getSuitFromString('h'),
					remainingCards: 0,
					kickerValues: [
						getValueFromString('A'),
						getValueFromString('K'),
						getValueFromString('6'),
						getValueFromString('5'),
						getValueFromString('3')
					],
					hand: [ 'Ah', 'Kh', '6h', '5h', '3h' ]
				}
			);
			expect(() => {
				return getEvaluationByType(makeHand(
					[ 'As', '2s', '3s', '4s', '6h', '7d', 'Qc' ]
				), 'flush-draw');
			}).to.throw(XError);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Ah', '5c', '6c', 'Kd', 'Ks' ]), 'flush-draw'),
				null
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Ah', '5c', '6c', 'Kd', 'Ks', 'Jc' ]), 'flush-draw'),
				null
			);
		});

		it('should detect a straight draw', function() {
			checkHandResult(
				getEvaluationByType(makeHand([ '2s', '3s', '4h', '5h', 'Td', 'Kc' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 4,
					highestCardsToStraightCombinations: 2,
					draws: [ {
						cardsToStraight: 4,
						highValue: getValueFromString('6'),
						neededValues: [ getValueFromString('6') ]
					},
					{
						cardsToStraight: 4,
						highValue: getValueFromString('5'),
						neededValues: [ getValueFromString('A') ]
					} ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'As', '3s', '4s', '5s', '6s', '7d' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 5,
					highestCardsToStraightCombinations: 1,
					draws: [ {
						cardsToStraight: 5,
						highValue: getValueFromString('7'),
						neededValues: [ ]
					},
					{
						cardsToStraight: 4,
						highValue: getValueFromString('8'),
						neededValues: [ getValueFromString('8') ]
					},
					{
						cardsToStraight: 4,
						highValue: getValueFromString('6'),
						neededValues: [ getValueFromString('2') ]
					} ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ 'Td', '8d', '9s', 'Th', 'Qh', 'Kh' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 4,
					highestCardsToStraightCombinations: 1,
					draws: [ {
						cardsToStraight: 4,
						highValue: getValueFromString('K'),
						neededValues: [ getValueFromString('J') ]
					} ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ '4d', '5d', '6d', '7s', '9h' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 4,
					highestCardsToStraightCombinations: 2,
					draws: [ {
						cardsToStraight: 4,
						highValue: getValueFromString('9'),
						neededValues: [ getValueFromString('8') ]
					}, {
						cardsToStraight: 4,
						highValue: getValueFromString('7'),
						neededValues: [ getValueFromString('3') ]
					}, {
						cardsToStraight: 3,
						highValue: getValueFromString('T'),
						neededValues: [ getValueFromString('T'), getValueFromString('8') ]
					}, {
						cardsToStraight: 3,
						highValue: getValueFromString('6'),
						neededValues: [ getValueFromString('3'), getValueFromString('2') ]
					} ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ '5d', '7h', '9d', 'Jh', 'Kd' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 3,
					highestCardsToStraightCombinations: 3,
					draws: [ {
						cardsToStraight: 3,
						highValue: getValueFromString('K'),
						neededValues: [ getValueFromString('Q'), getValueFromString('T') ]
					}, {
						cardsToStraight: 3,
						highValue: getValueFromString('J'),
						neededValues: [ getValueFromString('T'), getValueFromString('8') ]
					}, {
						cardsToStraight: 3,
						highValue: getValueFromString('9'),
						neededValues: [ getValueFromString('8'), getValueFromString('6') ]
					} ]
				}
			);
			checkHandResult(
				getEvaluationByType(makeHand([ '2s', '3s', '4h', 'Tc', 'Jc' ]), 'straight-draw'),
				{
					type: 'straight-draw',
					highestCardsToStraight: 3,
					highestCardsToStraightCombinations: 2,
					draws: [ {
						cardsToStraight: 3,
						highValue: getValueFromString('6'),
						neededValues: [ getValueFromString('6'), getValueFromString('5') ]
					}, {
						cardsToStraight: 3,
						highValue: getValueFromString('5'),
						neededValues: [ getValueFromString('A'), getValueFromString('5') ]
					} ]
				}
			);
			expect(() => {
				return getEvaluationByType(makeHand(
					[ 'As', '2s', '3s', '4s', '5h', '7d', 'Qc' ]
				), 'straight-draw');
			}).to.throw(XError);
			checkHandResult(
				getEvaluationByType(makeHand([ '3h', '4c', '8c', '9d', 'Ks' ]), 'straight-draw'),
				null
			);
			checkHandResult(
				getEvaluationByType(makeHand([ '3h', '4c', '5c', 'Kd', 'Ks', 'Jc' ]), 'flush-draw'),
				null
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
			'fh-1': getHandResult(makeHand([ 'Ah', 'As', 'Ad', 'Kc', 'Kd' ])),
			'fh-2': getHandResult(makeHand([ 'Ah', 'As', 'Ac', 'Kc', 'Kd' ])),
			'fh-3': getHandResult(makeHand([ 'Ah', 'As', 'Ad', 'Jc', 'Jd' ])),
			'fh-4': getHandResult(makeHand([ '9h', '9s', '9d', 'Ac', 'Ad' ])),
			'flush-1': getHandResult(makeHand([ 'Qs', 'Ts', '8s', '7s', '6s' ])),
			'flush-2': getHandResult(makeHand([ 'Qd', 'Td', '8d', '7d', '6d' ])),
			'flush-3': getHandResult(makeHand([ 'Js', 'Ts', '9s', '8s', '6s' ])),
			'flush-4': getHandResult(makeHand([ 'Qs', '6s', '4s', '3s', '2s' ])),
			'straight-1': getHandResult(makeHand([ 'Qs', 'Js', 'Td', '9s', '8c' ])),
			'straight-2': getHandResult(makeHand([ 'Qh', 'Jh', 'Td', '9s', '8c' ])),
			'straight-3': getHandResult(makeHand([ 'As', 'Ks', 'Qd', 'Js', 'Tc' ])),
			'straight-4': getHandResult(makeHand([ '5s', '4s', '3d', '2s', 'Ac' ])),
			'3oak-1': getHandResult(makeHand([ '9s', '9h', '9d', 'As', 'Js' ])),
			'3oak-2': getHandResult(makeHand([ '9s', '9h', '9d', 'As', 'Ks' ])),
			'3oak-3': getHandResult(makeHand([ '7s', '7h', '7d', 'As', 'Qs' ])),
			'2pair-1': getHandResult(makeHand([ 'Ks', 'Kd', 'Js', 'Jd', '4h' ])),
			'2pair-2': getHandResult(makeHand([ 'Ks', 'Kd', 'Js', 'Jd', '8h' ])),
			'2pair-3': getHandResult(makeHand([ 'Ks', 'Kd', '5s', '5d', '6h' ])),
			'2pair-4': getHandResult(makeHand([ 'As', 'Ad', '3s', '3d', '6h' ])),
			'2pair-5': getHandResult(makeHand([ 'Qs', 'Qd', '7s', '7d', '6h' ])),
			'pair-1': getHandResult(makeHand([ '9s', '9h', 'Ad', 'Ks', 'Js' ])),
			'pair-2': getHandResult(makeHand([ '9s', '9h', 'Ad', 'Ks', 'Qs' ])),
			'pair-3': getHandResult(makeHand([ '8s', '8h', 'As', 'Ks', 'Js' ])),
			'hc-1': getHandResult(makeHand([ 'Ks', 'Jh', 'Ts', '9s', '6s' ])),
			'hc-2': getHandResult(makeHand([ 'Ks', 'Qh', 'Ts', '9s', '5s' ]))
		};

		it('should always prefer hand with stronger result type', function() {
			expect(compareHandResults(HR['royal-flush'], HR['4oak-j-1'])).to.equal(-1);
			expect(compareHandResults(HR['4oak-j-1'], HR['straight-flush-1'])).to.equal(1);
			expect(compareHandResults(HR['4oak-j-3'], HR['fh-1'])).to.equal(-1);
			expect(compareHandResults(HR['fh-1'], HR['flush-1'])).to.equal(-1);
			expect(compareHandResults(HR['flush-1'], HR['straight-1'])).to.equal(-1);
			expect(compareHandResults(HR['straight-1'], HR['3oak-1'])).to.equal(-1);
			expect(compareHandResults(HR['3oak-1'], HR['2pair-1'])).to.equal(-1);
			expect(compareHandResults(HR['2pair-1'], HR['pair-1'])).to.equal(-1);
			expect(compareHandResults(HR['pair-1'], HR['hc-1'])).to.equal(-1);
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

		it('should correctly compare full house', function() {
			expect(compareHandResults(HR['fh-1'], HR['fh-2'])).to.equal(0);
			expect(compareHandResults(HR['fh-1'], HR['fh-3'])).to.equal(-1);
			expect(compareHandResults(HR['fh-1'], HR['fh-4'])).to.equal(-1);
		});

		it('should correctly compare flush', function() {
			expect(compareHandResults(HR['flush-1'], HR['flush-2'])).to.equal(0);
			expect(compareHandResults(HR['flush-2'], HR['flush-3'])).to.equal(-1);
			expect(compareHandResults(HR['flush-2'], HR['flush-4'])).to.equal(-1);
			expect(compareHandResults(HR['flush-3'], HR['flush-4'])).to.equal(1);
		});

		it('should correctly compare straight', function() {
			expect(compareHandResults(HR['straight-1'], HR['straight-2'])).to.equal(0);
			expect(compareHandResults(HR['straight-1'], HR['straight-3'])).to.equal(1);
			expect(compareHandResults(HR['straight-1'], HR['straight-4'])).to.equal(-1);
			expect(compareHandResults(HR['straight-3'], HR['straight-4'])).to.equal(-1);
		});

		it('should correctly compare three-of-a-kind', function() {
			expect(compareHandResults(HR['3oak-1'], HR['3oak-2'])).to.equal(1);
			expect(compareHandResults(HR['3oak-1'], HR['3oak-3'])).to.equal(-1);
		});

		it('should correctly compare two-pair', function() {
			expect(compareHandResults(HR['2pair-1'], HR['2pair-2'])).to.equal(1);
			expect(compareHandResults(HR['2pair-1'], HR['2pair-3'])).to.equal(-1);
			expect(compareHandResults(HR['2pair-3'], HR['2pair-4'])).to.equal(1);
			expect(compareHandResults(HR['2pair-3'], HR['2pair-5'])).to.equal(-1);
		});

		it('should correctly compare pair', function() {
			expect(compareHandResults(HR['pair-1'], HR['pair-2'])).to.equal(1);
			expect(compareHandResults(HR['pair-1'], HR['pair-3'])).to.equal(-1);
		});

		it('should correctly compare high cards', function() {
			expect(compareHandResults(HR['hc-1'], HR['hc-2'])).to.equal(1);
		});

	});

	describe('#getFullEvaluation', function() {

		it('should do input sanity checking', function() {
			expect(() => {
				return getFullEvaluation(makeHand(
					[ 'As', 'Ac' ]
				));
			}).to.throw(XError);
			expect(() => {
				return getFullEvaluation(makeHand(
					[ 'As', 'Ac', 'Ks', 'Kc', 'Jd', '9s', '7c', '3c' ]
				));
			}).to.throw(XError);
		});

		it('should correctly evaluate very strong hands', function() {
			checkHandResult(
				getFullEvaluation(makeHand([ '2s', '2h', '3h', '4h', '5h', '6h' ])),
				{
					result: {
						type: 'straight-flush',
						suit: getSuitFromString('h'),
						highValue: getValueFromString('6')
					},
					evaluations: [ {
						type: 'straight-flush',
						suit: getSuitFromString('h'),
						highValue: getValueFromString('6')
					} ]
				}
			);
			checkHandResult(
				getFullEvaluation(makeHand([ '2s', '2h', '2d', '2c', '5h', '6h','7h' ])),
				{
					result: {
						type: 'four-of-a-kind',
						value: getValueFromString('2')
					},
					evaluations: [ {
						type: 'four-of-a-kind',
						value: getValueFromString('2')
					} ]
				}
			);
			checkHandResult(
				getFullEvaluation(makeHand([ '2c', '2h', '2s', '3s', '3d', '4s', '4c' ])),
				{
					result: {
						type: 'full-house',
						threeValue: getValueFromString('2'),
						twoValue: getValueFromString('4')
					},
					evaluations: [ {
						type: 'full-house',
						threeValue: getValueFromString('2'),
						twoValue: getValueFromString('4')
					} ]
				}
			);
		});

		it('should include results and all possible draws', function() {
			checkHandResult(
				getFullEvaluation(makeHand([ 'Kh', 'Jh', 'Th', '4s', '3s', '2s' ])),
				{
					result: {
						type: 'high-cards'
					},
					evaluations: [ {
						type: 'high-cards'
					} ]
				}
			);
			checkHandResult(
				getFullEvaluation(makeHand([ '4h', '7h', 'Th', 'Jh', 'Qh', '7c', '7s' ])),
				{
					result: {
						type: 'flush',
						suit: getSuitFromString('h')
					},
					evaluations: [ {
						type: 'three-of-a-kind',
						value: getValueFromString('7')
					}, {
						type: 'flush',
						suit: getSuitFromString('h')
					} ]
				}
			);
			checkHandResult(
				getFullEvaluation(makeHand([ '4s', '5s', '6s', '7s', '5h', '7h' ])),
				{
					result: {
						type: 'two-pair',
						values: [ getValueFromString('7'), getValueFromString('5') ]
					},
					evaluations: [ {
						type: 'two-pair',
						values: [ getValueFromString('7'), getValueFromString('5') ]
					}, {
						type: 'flush-draw',
						suit: getSuitFromString('s')
					}, {
						type: 'straight-draw',
						highestCardsToStraight: 4,
						highestCardsToStraightCombinations: 2
					} ]
				}
			);
		});

		it('should not include draws in 7 card hands', function() {
			checkHandResult(
				getFullEvaluation(makeHand([ 'Kh', 'Ks', 'Jc', '8d', '7d', '6d', '5d' ])),
				{
					result: {
						type: 'pair',
						value: getValueFromString('K')
					},
					evaluations: [ {
						type: 'pair',
						value: getValueFromString('K')
					} ]
				}
			);
		});

		it('should not include straight/flush draws in hands with a made straight/flush', function() {
			checkHandResult(
				getFullEvaluation(makeHand([ 'As', 'Jc', 'Tc', '8c', '6c', '4c' ])),
				{
					result: {
						type: 'flush',
						suit: getSuitFromString('c')
					},
					evaluations: [ {
						type: 'high-cards'
					}, {
						type: 'flush',
						suit: getSuitFromString('c')
					} ]
				}
			);
			checkHandResult(
				getFullEvaluation(makeHand([ 'Kc', 'Qh', 'Jh', 'Th', '6h', '4h' ])),
				{
					result: {
						type: 'flush',
						suit: getSuitFromString('h')
					},
					evaluations: [ {
						type: 'high-cards'
					}, {
						type: 'flush',
						suit: getSuitFromString('h')
					}, {
						type: 'straight-draw',
						highestCardsToStraight: 4,
						highestCardsToStraightCombinations: 2
					} ]
				}
			);
		});

	});

});
