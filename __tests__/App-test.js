/**
 * @format
 *
 * History: this file used to be the stock template test —
 * `import App from '../App'` — and there is no App.js at the repo root. The root
 * component in this repo is `Root.js`, exported via `module.exports`. So Jest died
 * at module resolution and `yarn test` had never run.
 *
 * What it does now is deliberately the least brittle thing that still has value: it
 * builds the real module graph from the app entry point. That is the regression that
 * actually happened here — a missing/renamed module — and it is caught without a
 * device, a bundler, or a screenshot.
 */
import "react-native";

describe("app entry point", () => {
	// App.js's componentDidMount starts a fire-and-forget launch chain
	// (pauseExecution -> InteractionManager.runAfterInteractions -> electrum/biometrics)
	// that outlives the component. Left on real timers it keeps running after teardown,
	// which leaks a handle into the next test and makes Jest report the module registry
	// as torn down. Freezing timers keeps the chain from advancing at all.
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
	});

	it("loads the whole module graph from Root without throwing", () => {
		const Root = require("../Root");
		expect(typeof Root).toBe("function");
	});

	it("renders the root component into a tree", () => {
		// App.js's componentDidMount kicks off a fire-and-forget launch chain
		// (pauseExecution -> InteractionManager.runAfterInteractions -> electrum/
		// biometrics work) that is not bounded by the component lifecycle. With real
		// timers it keeps running past the end of the test and Jest reports the module
		// registry as torn down. Fake timers freeze it at the first setTimeout, so the
		// initial render is exercised and nothing outlives the test.
		const React = require("react");
		const renderer = require("react-test-renderer");
		const Root = require("../Root");

		let tree;
		renderer.act(() => {
			tree = renderer.create(React.createElement(Root));
		});

		expect(tree.toJSON()).toBeTruthy();

		renderer.act(() => {
			tree.unmount();
		});

	});
});
