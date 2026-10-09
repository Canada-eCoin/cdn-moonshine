/**
 * `preset: 'react-native'` supplies the transform, moduleNameMapper and the RN jest
 * setup file (which installs the platform/native mocks). Setting `setupFiles` here
 * REPLACES the preset's array rather than appending to it, so the preset's entries
 * are merged back in explicitly before adding ours.
 */
const rnPreset = require('react-native/jest-preset');

// The RN preset only whitelists react-native itself. Several of this app's
// dependencies ship ES modules, which Jest cannot parse unless they are transformed:
// react-native-qrcode-svg re-exports with `export ... from`, styled-components and
// react-native-vector-icons ship ESM, etc. Anything matching `react-native*` is
// whitelisted here, as are the crypto/format packages the wallet pulls in.
const transformAllowlist =
	'(?:(?:jest-)?react-native|@react-native[^/]*|react-redux|redux[^/]*|@reduxjs|reselect|immer|styled-components|@meteorrn|bitcoinjs-lib|bitcoin-units|tiny-secp256k1|bip32|bip38|bip39|wif|bech32|uuid|nanoid|query-string|strict-uri-encode|decode-uri-component|split-on-first|filter-obj)';

module.exports = {
	preset: 'react-native',
	setupFiles: [...(rnPreset.setupFiles || []), '<rootDir>/jest.setup.js'],
	testMatch: ['<rootDir>/__tests__/**/*.js'],
	moduleNameMapper: {
		// Metro honours the package.json "react-native" field, which styled-components
		// uses to swap its web CJS build for the native one (see the "react-native" key
		// in node_modules/styled-components/package.json). Jest does not honour it, so
		// without this mapping `styled.View`, `styled.Text`, ... are undefined and every
		// file that imports src/styles/components throws on load.
		"^styled-components$": 'styled-components/native',
	},
	transformIgnorePatterns: [`node_modules/(?!${transformAllowlist})`],
	collectCoverageFrom: ['src/utils/**/*.js', '!src/utils/electrum/**'],
};
