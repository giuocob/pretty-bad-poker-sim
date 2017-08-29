// This is the logic for interpreting queries against hands and hand evaluation objects.

'use strict';
const XError = require('xerror');
const commonQuery = require('common-query');
const commonSchema = require('common-schema');
const cardUtils = require('./card-utils');
const handEval = require('./hand-eval');

// A schema for the hand eval objects we will be querying against
const cardValueSchema = { type: 'number', isCardValue: true };
const cardValueArraySchema = {
	type: 'array',
	elements: cardValueSchema,
	isCardValueArray: true
};
const cardSuitSchema = { type: 'number', isCardSuit: true };
const cardSchema = {
	type: 'object',
	properties: {
		value: cardValueSchema,
		suit: cardSuitSchema
	},
	isCard: true
};
const cardArraySchema = {
	type: 'array',
	elements: cardSchema,
	isCardArray: true
};
const pocketEvalSchema = {
	pairValue: cardValueSchema,
	suitedSuit: cardSuitSchema,
	valueSpread: { type: 'number' },
	inclusiveStraightCount: { type: 'number' },
	semiInclusiveStraightCount: { type: 'number' }
};
const resultEvalSchema = {
	evalType: { type: 'string' },
	suit: cardSuitSchema,
	highValue: cardValueSchema,
	value: cardValueSchema,
	values: cardValueArraySchema,
	threeValue: cardValueSchema,
	twoValue: cardValueSchema,
	kickerValues: cardValueArraySchema,
	// Flush draw
	remainingCards: { type: 'number' },
	// Straight draw
	highestCardsToStraight: { type: 'number' },
	highestCardsToStraightCombinations: { type: 'number' },
	draws: {
		type: 'array',
		elements: {
			cardsToStraight: { type: 'number' },
			highValue: cardValueSchema,
			neededValues: cardValueArraySchema
		}
	}
};

const fullEvalSchema = commonSchema.createSchema({
	pocket: cardArraySchema,
	community: cardArraySchema,
	pocketEval: pocketEvalSchema,
	resultEval: {
		result: resultEvalSchema,
		evaluations: {
			type: 'array',
			elements: resultEvalSchema
		}
	}
});

// Custom query factory to which we will register our custom operators
let queryFactory = new commonQuery.QueryFactory();


function normalizeFullEval(fullEval) {
	return fullEvalSchema.normalize(fullEval, { removeUnknownFields: true });
}

function getNormalizedEvalQuery(queryData) {
	let query = queryFactory.createQuery(queryData, { skipValidate: true });
	// Traverse query to replace any string values/suits with their correct values
	
	function substituteValue(fieldValue, field, parent, parentKey) {
		if (typeof fieldValue !== 'string') return;
		let subschema = commonQuery.Query.getQueryPathSubschema(fullEvalSchema, field)[0];
		if (!subschema) throw new XError(XError.INVALID_ARGUMENT, 'Could not find subschema for query field');
		// Do substitution if this is a query on a card, suit, or value
		if (subschema.isCard || subschema.isCardArray) {
			let cardFromString = cardUtils.getCardComponentsFromString(fieldValue);
			parent[parentKey] = {
				value: cardFromString.value,
				suit: cardFromString.suit
			};
		} else if (subschema.isCardValue || subschema.isCardValueArray) {
			parent[parentKey] = cardUtils.getValueFromString(fieldValue);
		} else if (subschema.isCardSuit) {
			parent[parentKey] = cardUtils.getSuitFromString(fieldValue);
		}
	}

	query._traverse({
		exprOperator: function(fieldValue, field, operator, expr, query, parent, parentKey) {
			substituteValue(fieldValue, field, parent, parentKey);
		},
		exactMatch: function(fieldValue, field, parent, parentKey) {
			substituteValue(fieldValue, field, parent, parentKey);
		}
	});

	query.validate();
	return query;
}

function normalizePokerRoundMatches(matches) {
	if (!Array.isArray(matches)) {
		matches = [ matches ];
	}
	for (let match of matches) {
		if (typeof match.playerIndex !== 'number') {
			match.playerIndex = 0;
		}
		if (typeof match.roundPart !== 'string') {
			throw new XError(XError.INVALID_ARGUMENT, 'Match object must have roundPart');
		}
		if (match.query) {
			if (typeof match.query.matches !== 'function') {
				match.query = getNormalizedEvalQuery(match.query);
			}
		}
	}
	return matches;
}

// Returns true if all of the given match objects match the round, and false otherwise.
function processPokerRoundMatches(pokerRound, matches, skipNormalize) {
	if (!skipNormalize) matches = normalizePokerRoundMatches(matches);
	// If all matches pass then the entire array passes, otherwise it fails
	for (let match of matches) {
		let pocket = pokerRound.getPocketCards(match.playerIndex);
		let community = pokerRound.getCommunityCards(match.roundPart);
		if (!community || community.length === 0) community = undefined;
		let fullEval = handEval.getFullEvaluation(pocket, community);
		if (!match.query.matches(fullEval)) return false;
	}
	return true;
}

module.exports = {
	fullEvalSchema,
	normalizeFullEval,
	getNormalizedEvalQuery,
	normalizePokerRoundMatches,
	processPokerRoundMatches
};
