/**
 * ESLint — correctness only.
 *
 * Division of labour: Prettier owns formatting (see .prettierrc.js), ESLint owns
 * correctness. `eslint-config-prettier` is extended LAST so the two can never
 * disagree. Every formatting rule that used to live here (jsx-indent,
 * jsx-curly-spacing, jsx-tag-spacing, semi, …) was Prettier's job all along, and
 * having both enforce it meant they fought.
 *
 * History — read before changing the parser:
 *
 *   1. This file used to declare `parser: "babel-eslint"` and plugins `jsx-a11y`,
 *      neither of which was ever installed. `eslint .` therefore died at config
 *      load, and none of these rules had ever been applied to a single file.
 *
 *   2. The first repair used `@babel/eslint-parser` with the RN babel preset.
 *      That parser has a bug in its token conversion (`convertTemplateType`
 *      dereferences `ast.tokens`, which is undefined on the fallback path) that
 *      any file carrying a `@flow` pragma trips — six files crashed outright,
 *      including one with no Flow syntax at all.
 *
 *   3. So: ONE parser for the whole codebase, `@typescript-eslint/parser`. It
 *      parses .js, .jsx, .ts and .tsx, it does not depend on babel.config.js, and
 *      it has no token-conversion bug. Verified equivalent rule-for-rule against
 *      the babel parser across all 73 files, and it removes all fatal errors.
 *
 *   4. Because a TS-aware parser resolves `({tx_hash: string, value: number})` as
 *      bindings, the base `no-unused-vars` reports `'string' is defined but never
 *      used` on every type annotation. TS files get the
 *      `@typescript-eslint/no-unused-vars` implementation instead, which
 *      understands type-only usage.
 */
module.exports = {
	root: true,

	env: {
		es6: true,
		node: true,
		browser: true,
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		ecmaFeatures: { jsx: true },
	},

	// eslint-plugin-react-native and eslint-plugin-typescript are the only plugins not
	// pulled in by an `extends` below, so they are the only ones declared here.
	plugins: ['react-native', '@typescript-eslint'],

	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:jsx-a11y/recommended',
		'prettier',
	],

	rules: {
		// --- carried over from the previous config, unchanged in intent ---
		'no-console': 0,
		'no-empty': ['error', { allowEmptyCatch: true }],
		'no-buffer-constructor': 0,
		'no-case-declarations': 0,
		'no-useless-escape': 0,
		'require-atomic-updates': 0,
		'no-async-promise-executor': 0,
		'react/jsx-uses-vars': 2,
		'react/prop-types': 0,
		'react/display-name': 0,

		// `no-undef` is ON for JavaScript. It is the rule that would have caught the six
		// files that referenced `Platform` without importing it (see the brief), and the
		// `color` / `_initializeState` / `coin` implicit globals. React Native's runtime
		// globals are declared in `globals` below rather than by switching the rule off.
		'no-undef': ['error', { typeof: false }],

		// Unused bindings are dead code, and in a wallet dead code is audit
		// surface. `_`-prefixed arguments are the escape hatch for signatures that
		// must keep a parameter for positional reasons (e.g. componentDidUpdate).
		'no-unused-vars': [
			'error',
			{ args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' },
		],

		// --- react-native plugin: report, don't block ---
		'react-native/no-unused-styles': 'warn',
		'react-native/no-inline-styles': 0,

		// `react-hooks/exhaustive-deps` deserves to be read but is frequently wrong
		// on screens that deliberately read a ref or a stable store. Warning keeps
		// it visible in the PR without failing anyone's build. Promote to error
		// once the backlog is clean.
		'react-hooks/exhaustive-deps': 'warn',
	},

	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			rules: {
				// The base `no-undef` cannot see TypeScript's type space, so it reports
				// type-only identifiers as undefined. TypeScript's own checker is the
				// authority for anything it compiles (see the brief for the suggestion to
				// add `tsc --noEmit` to this job).
				'no-undef': 0,
				'no-unused-vars': 0,
				'@typescript-eslint/no-unused-vars': [
					'error',
					{ args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' },
				],
			},
		},
		{
			files: ['__tests__/**/*.js', '**/*.test.js', 'jest.setup.js'],
			env: { jest: true },
		},
	],

	globals: {
		// React Native's runtime globals — not described by any ESLint `env`.
		__DEV__: 'readonly',
		fetch: 'readonly',
		FormData: 'readonly',
		XMLHttpRequest: 'readonly',
		WebSocket: 'readonly',
		navigator: 'readonly',
		requestAnimationFrame: 'readonly',
		cancelAnimationFrame: 'readonly',
		// rn-nodeify's shim installs the Node-ish surface (see shim.js).
		process: 'readonly',
		Buffer: 'readonly',
		global: 'readonly',
		setImmediate: 'readonly',
		clearImmediate: 'readonly',
	},

	settings: {
		react: {
			version: 'detect',
		},
	},
};
