/**
Understand what is going on here in this file..
https://rossbulat.medium.com/how-to-use-redux-persist-in-react-native-3b0d912e730a

this file gets loaded by the AppRegistry, it was registered in /index.js

best practices for redux -> https://redux.js.org/style-guide/style-guide
Ducks: Redux Reducer Bundles -> https://github.com/erikras/ducks-modular-redux
**/

import React from "react";
import App from "./src/components/App";

// the local storage we'll be using to persist data
import AsyncStorage from "@react-native-async-storage/async-storage";

// We'll import the store initializer but NOT the whole module to avoid circular dependency
import { initializeWithStore } from "./src/utils/ecoincore";

// redux boilerplate
import { legacy_createStore as createStore, applyMiddleware, compose } from "redux";
import { PersistGate } from "redux-persist/integration/react";
import reducer from "./src/reducers";
import { thunk } from "redux-thunk";
import { createLogger } from "redux-logger";
import LinearGradient from "react-native-linear-gradient";
import { Provider } from "react-redux";
import { persistStore, persistReducer } from "redux-persist";

// Setup middleware
const middlewares = [];
middlewares.push(thunk);

if (process.env.ENVIRONMENT !== "production") {
    const logger = createLogger({collapsed: true});
    middlewares.push(logger);
}

// persist config
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
};

// wrap persist API around root reducer
const persistedReducer = persistReducer(persistConfig, reducer);

// create store with middleware
export const store = createStore(
    persistedReducer,
    compose(applyMiddleware(...middlewares))
);

// Make store available globally to break require cycles
global.reduxStore = store;

const persistor = persistStore(store);

// Initialize ecoincore with the store AFTER it's fully created
initializeWithStore(store);

// Root component
const Root = () => {
	return (
		<Provider store={store}>
			<PersistGate
				loading={<LinearGradient 
					style={{ flex: 1 }} 
					colors={["#FF45bf", "#7931ab", "#FF31ab", "#68219b", "#FF1993", "#59158e", "#FFF28b"]} 
					start={{x: 0.0, y: 0.0}} 
					end={{x: 1.0, y: 1.0}} 
				/>}
				onBeforeLift={null}
				persistor={persistor}
			>
				<App />
			</PersistGate>
		</Provider>
	);
};

module.exports = Root;
