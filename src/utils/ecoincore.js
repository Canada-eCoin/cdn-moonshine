
import * as actions from "../actions";
import settings from '../config/settings';
import Meteor, { Mongo } from '@meteorrn/core';

console.log('Initializing ecoincore.js module');

// React Native polyfill
process.nextTick = setImmediate;

// Connection settings
const CACHEBOX_HOST = 'ecoincore.com';

// Store tracking
let store = null;
let storeCheckInterval;
let documentKeys = {};

// Safe dispatch function - will only dispatch if store is available
const safeDispatch = (action) => {
  try {
    // Get current store reference (might have been updated)
    if (store && typeof store.dispatch === 'function') {
      store.dispatch(action);
    } else {
      console.warn('Attempted to dispatch but store not available:', action.type);
    }
  } catch (err) {
    console.error('Error during dispatch:', err);
  }
};

// DDP event types to listen for
const ddpEvents = [
  // connection messages
  'connected',
  'disconnected',
  // Subscription messages (Meteor Publications)
  'ready',
  'nosub',
  'added',
  'changed',
  'removed',
  // Method messages (Meteor Methods)
  'result',
  'updated',
  // Error messages
  'error',
];

// Initialize Meteor connection
Meteor.connect(`wss://${CACHEBOX_HOST}/websocket`); 
const Data = Meteor.getData();

// Setup basic connection event logging
// Data.on('connected', (e) => console.debug('connected', e));
// Data.on('disconnected', (e) => console.debug('disconnected', e));
// Data.on('loggingIn', (e) => console.debug('loggingIn', e));
// Data.on('loggingOut', (e) => console.debug('loggingOut', e));

// Setup basic DDP listeners for all events, which will just track document keys initially
// This ensures we don't miss any updates while waiting for the store to be initialized
function setupInitialDDPEventTracking() {
  console.debug('Setting up initial DDP event tracking (without dispatching)');
  
  ddpEvents.forEach((eventName) => {
    Data.ddp.on(eventName, (event) => {
      if (event?.collection === "ExchangeRates") {
        // console.log({event})
        if(event.fields?.ticker) documentKeys[event.id] = event.fields?.ticker;
        if(!documentKeys[event.id]) return console.log('dumping, unknown ticker');
        // console.debug('Tracking ExchangeRate update for', documentKeys[event.id] || 'unknown ticker');

        if(event.msg === "removed") return;
        if(!event.fields?.rate) return;

        // console.log({event});
        console.log(`${documentKeys[event.id]} : ${Number(event.fields?.rate).toFixed(12)}`)
        safeDispatch({
          type: actions.EXCHANGE_RATES_UPDATED,
          payload: {...event.fields, ticker: documentKeys[event.id]}
        });

      }
    });
  });
}

// Start tracking changes immediately, even before store is available
setupInitialDDPEventTracking();

// Function to set up DDP event handlers with Redux dispatch capability
function setupDDPEventHandlers() {
  if (!store || typeof store.dispatch !== 'function') {
    console.warn('Cannot set up DDP event handlers: store not available');
    return false;
  }

  console.debug('Setting up DDP event handlers with store available');
  
  // Set up listeners for all DDP events
  // ddpEvents.forEach((eventName) => {
  //   Data.ddp.on(eventName, (event) => {
  //     if (event?.collection === "ExchangeRates") {

  //       console.log({event})
  //       documentKeys[event.id] = event.fields?.ticker;
  //       safeDispatch({
  //         type: actions.EXCHANGE_RATES_UPDATED,
  //         payload: {...event.fields}
  //       });
  //     }
  //   });
  // });
  
  return true;
}

// Socket event logging
const socket = Data.ddp.socket;
const socketEvents = ['open', 'close', 'message:out', 'message:in', 'error'];
socketEvents.forEach((eventName) => {
  // socket.on(eventName, (event) => console.debug(eventName, event));
});

// Collection setup
let Chainpacks = new Mongo.Collection('Chainpacks');
let ExchangeRates = new Mongo.Collection('ExchangeRates');
Meteor.subscribe('ExchangeRates');
Meteor.subscribe('Chainpacks');

export const collections = [ExchangeRates, Chainpacks]

// Initialize store reference
function initializeStore() {
  try {
    // IMPORTANT: Don't directly require Root.js to avoid circular dependencies
    // Instead, access the store through the global scope if it's been exposed there
    
    if (global.reduxStore && typeof global.reduxStore.dispatch === 'function') {
      console.debug('Found store in global.reduxStore');
      store = global.reduxStore;
      return true;
    }
    
    console.debug('Store not available yet in global scope');
    return false;
  } catch (err) {
    console.log('Error accessing store:', err.message);
    return false;
  }
}

// Function to check for store and set up listeners
function checkAndSetupStore() {
  if (initializeStore()) {
    clearInterval(storeCheckInterval);
    setupDDPEventHandlers();
    return true;
  }
  return false;
}

// Start polling for store availability
console.debug('Starting store availability check');
checkAndSetupStore();
storeCheckInterval = setInterval(checkAndSetupStore, 500);

// Expose a function to manually update the store reference from Root.js
// This breaks the circular dependency by letting Root.js set the store
// after it's been initialized
export function updateStoreReference(newStore) {
  if (newStore && typeof newStore.dispatch === 'function') {
    store = newStore;
    setupDDPEventHandlers();
    console.debug('Store reference manually updated from Root.js');
    return true;
  }
  return false;
}

// Export a function to initialize this module with the store
// Root.js should call this after creating the store
export const initializeWithStore = (reduxStore) => {
  if (reduxStore && typeof reduxStore.dispatch === 'function') {
    store = reduxStore;
    // Clear the interval if it's still running
    if (storeCheckInterval) {
      clearInterval(storeCheckInterval);
      storeCheckInterval = null;
    }
    setupDDPEventHandlers();
    console.debug('eCoinCore initialized with store from Root.js');
    return true;
  }
  return false;
};

console.log('eCoinCore module loaded');


