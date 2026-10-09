/**
 * Jest setup — runs before every test file.
 *
 * React Native's own jest preset is kept (see jest.config.js, which merges its
 * setupFiles) and this file adds the two things the app needs that Jest does not
 * provide: mocks for the native modules that have no JS fallback, and a stub for
 * `src/utils/ecoincore`, which opens a DDP websocket to the eCoinCore CacheBox at
 * import time. Tests must never dial out.
 */

/* eslint-env jest */

// Root.js attaches redux-logger unless ENVIRONMENT === 'production'. In tests it would
// print the entire store on every dispatch, so take the production path.
process.env.ENVIRONMENT = 'production';

// AsyncStorage ships its own mock.
jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// `src/utils/ecoincore` runs Meteor.connect() at module scope. Nothing in a unit
// test wants a websocket, so it is replaced wholesale.
jest.mock('./src/utils/ecoincore', () => ({
	__esModule: true,
	initializeWithStore: jest.fn(),
	updateStoreReference: jest.fn(),
	collections: [],
	default: {},
}));

// --- native modules with no JS fallback ---
jest.mock('react-native-bootsplash', () => ({
	hide: jest.fn(() => Promise.resolve()),
	show: jest.fn(() => Promise.resolve()),
	useHideAnimation: () => ({ containerStyle: {}, logoStyle: {}, brandStyle: {} }),
}));

jest.mock('react-native-touch-id', () => ({
	authenticate: jest.fn(() => Promise.resolve(true)),
	isSupported: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-keychain', () => ({
	setGenericPassword: jest.fn(() => Promise.resolve(false)),
	getGenericPassword: jest.fn(() => Promise.resolve(false)),
	resetGenericPassword: jest.fn(() => Promise.resolve(false)),
	ACCESSIBLE: {},
	ACCESS_CONTROL: {},
	AUTHENTICATION_TYPE: {},
	SECURITY_LEVEL: {},
	STORAGE_TYPE: {},
}));

jest.mock('@react-native-community/netinfo', () => ({
	addEventListener: jest.fn(() => jest.fn()),
	fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
	useNetInfo: () => ({ isConnected: false }),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
	setString: jest.fn(),
	getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native-haptic-feedback', () => ({ trigger: jest.fn() }));

jest.mock('react-native-randombytes', () => ({
	randomBytes: (n, cb) => cb(null, Buffer.alloc(n)),
}));

// --- native-backed view components: render children, nothing else ---
const passthrough = (name) => {
	const React = require('react');
	const { View } = require('react-native');
	const C = ({ children, ...rest }) => React.createElement(View, rest, children);
	C.displayName = name;
	return C;
};

jest.mock('react-native-linear-gradient', () => passthrough('LinearGradient'));
jest.mock('react-native-modal', () => passthrough('Modal'));
jest.mock('@react-native-community/slider', () => passthrough('Slider'));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// vision-camera reaches for the TurboModule registry at import time and cannot run in
// Node at all. Mirrors the hooks src/components/Camera.tsx actually calls.
jest.mock('react-native-vision-camera', () => ({
	Camera: passthrough('VisionCamera'),
	useCameraDevice: () => null,
	useCameraPermission: () => ({ hasPermission: false, requestPermission: jest.fn() }),
	useCodeScanner: () => ({ codeTypes: [], onCodeScanned: jest.fn() }),
}));

// lottie parses animation JSON via a native driver.
jest.mock('lottie-react-native', () => passthrough('LottieView'));

// React Native 0.78's jest setup no longer provides
// InteractionManager.runAfterInteractions, but src/components/App.js uses it in its
// async componentDidMount (after a 100ms `pauseExecution`) to defer the biometrics
// check until launch animations settle. Shim it the way the runtime behaves so that
// flow can be exercised instead of throwing halfway through.
{
	const { InteractionManager } = require('react-native');
	if (typeof InteractionManager.runAfterInteractions !== 'function') {
		InteractionManager.runAfterInteractions = (task) => {
			const handle = setTimeout(() => task && task(), 0);
			return { cancel: () => clearTimeout(handle) };
		};
		InteractionManager.clearInteractionHandle = jest.fn();
		InteractionManager.createInteractionHandle = jest.fn(() => 1);
	}
}
