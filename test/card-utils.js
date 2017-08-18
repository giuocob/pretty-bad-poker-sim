'use strict';
const expect = require('chai').expect;
const XError = require('xerror');
const cardUtils = require('../lib/card-utils');
const getCardComponents = cardUtils.getCardComponents;
const getCardIdFromComponents = cardUtils.getCardIdFromComponents;
const getCardString = cardUtils.getCardString;
const getCardComponentsFromString = cardUtils.getCardComponentsFromString;

describe('cardUtils', function() {

	describe('#getCardComponents', function() {

		it('should return correct values', function() {
			expect(() => getCardComponents(0)).to.throw(XError);
			expect(getCardComponents(1)).to.deep.equal(
				{ cardId: 1, value: 2, suit: 1 }
			);
			expect(getCardComponents(6)).to.deep.equal(
				{ cardId: 6, value: 7, suit: 1 }
			);
			expect(getCardComponents(13)).to.deep.equal(
				{ cardId: 13, value: 14, suit: 1 }
			);
			expect(getCardComponents(14)).to.deep.equal(
				{ cardId: 14, value: 2, suit: 2 }
			);
			expect(getCardComponents(52)).to.deep.equal(
				{ cardId: 52, value: 14, suit: 4 }
			);
			expect(() => getCardComponents(53)).to.throw(XError);
		});

	});

	describe('#getCardIdFromComponents', function() {

		it('should return correct values', function() {
			expect(getCardIdFromComponents(3, 1)).to.equal(2);
			expect(getCardIdFromComponents(14, 2)).to.equal(26);
			expect(() => getCardIdFromComponents(1, 3)).to.throw(XError);
			expect(() => getCardIdFromComponents(12, 5)).to.throw(XError);
		});

		it('should be inverse of getCardComponents', function() {
			for (let i = 1; i <= 52; i++) {
				let components = getCardComponents(i);
				expect(getCardIdFromComponents(components.value, components.suit)).to.equal(i);
			}
		});

	});

	describe('#getCardString', function() {

		it('should return correct values', function() {
			expect(getCardString(2)).to.equal('3c');
			expect(getCardString(2, true)).to.equal('Three of Clubs');
		});

		it('should accept cardId and cardComponents', function() {
			expect(getCardString(20)).to.equal(getCardString(getCardComponents(20)));
		});

	});

	describe('#getCardComponentsFromString', function() {

		it('should return correct values', function() {
			expect(() => getCardComponentsFromString('FOOBAR')).to.throw(XError);
			expect(() => getCardComponentsFromString('1C')).to.throw(XError);
			expect(() => getCardComponentsFromString('QK')).to.throw(XError);
			expect(getCardComponentsFromString('TS')).to.deep.equal(
				getCardComponentsFromString('ts')
			);
			expect(getCardComponentsFromString('5d')).to.deep.equal({
				cardId: getCardIdFromComponents(5, 2),
				value: 5,
				suit: 2
			});
		});

	});

});
