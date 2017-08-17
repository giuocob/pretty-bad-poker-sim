// Utilities for dealing with randomness.

'use strict';
const seedrandom = require('seedrandom');
const XError = require('xerror');

// Seeded pseudorandom RNG. Wrapper for the seedrandom module.
class RNG {

	// Seed should be integer between 1 and 100,000,000
	constructor(seed) {
		if (!seed) seed = Math.floor(Math.random() * 100000000);
		if (seed % 1 !== 0) throw new XError(XError.INVALID_ARGUMENT, 'Seed must be an integer');
		if (seed < 1 || seed > 100000000) throw new XError(XError.INVALID_ARGUMENT, 'Seed is out of bounds');
		this.seed = seed;
		this.prng = seedrandom(seed);
	}

	// Next random float between 0 and 1
	random() {
		return this.prng();
	}

	// Random int between low and high, inclusive
	randomInt(low, high) {
		if (low % 1 !== 0 || high % 1 !== 0 || high < low) {
			throw new XError(XError.INVALID_ARGUMENT, 'Silly usage of RNG');
		}
		let range = high - low + 1;
		return Math.floor(this.random() * range) + low;
	}

	// Random float between low and high
	randomFloat(low, high) {
		if (high < low) {
			throw new XError(XError.INVALID_ARGUMENT, 'Silly usage of RNG');
		}
		let range = high - low;
		return (this.random() * range) + low;
	}
}

// Default RNG for use when seeded behavior is not needed. Seed is generated at startup.
let defaultRNG = new RNG();

// Uniformly shuffles an array in-place and returns it.
function shuffleArray(arr, rng) {
	if(!rng) rng = defaultRNG;
	for(let i = 0; i < arr.length; i++) {
		let toSwap = rng.randomInt(i, arr.length - 1);
		let tmp = arr[i];
		arr[i] = arr[toSwap];
		arr[toSwap] = tmp;
	}
	return arr;
}

module.exports = {
	RNG,
	defaultRNG,
	shuffleArray
};
