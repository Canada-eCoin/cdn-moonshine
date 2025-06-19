// @flow weak
import * as actions from "../actions"
let counter = 0;

module.exports = (state = {}, action) => {
	if (action.type === actions.EXCHANGE_RATES_UPDATED) {
		return {
			...state,
			[action.payload.ticker]: {...state[action.payload.ticker], ...action.payload}
		};
	} else return state;
}
