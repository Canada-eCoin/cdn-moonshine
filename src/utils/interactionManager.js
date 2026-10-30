/**
 * InteractionManager was removed from React Native core in 0.88 — importing it from
 * "react-native" now throws an invariant at module load, and `runAfterInteractions` is
 * gone with it. The app used it in ~10 places to defer wallet work (refresh, reconnect,
 * loading flags) until the UI had settled.
 *
 * This keeps the call-site shape (`InteractionManager.runAfterInteractions(task)`) so
 * none of those sites had to change, and implements the contract with a macrotask: the
 * task runs after the current render has committed, not in the middle of it.
 *
 * React Native's own advice is to split long tasks and/or use `requestIdleCallback`.
 * That would change when each of these runs relative to animations, so it is a
 * behavioural decision, not a mechanical one — worth revisiting per call site rather
 * than swapping the implementation underneath all of them at once.
 *
 * Returns the same `{ cancel }` handle the original did, since some call sites may
 * rely on it later.
 */
const runAfterInteractions = (task) => {
	const handle = setTimeout(() => {
		try {
			if (typeof task === "function") task();
		} catch (e) {
			console.log(e);
		}
	}, 0);
	return { cancel: () => clearTimeout(handle) };
};

const InteractionManager = { runAfterInteractions };

export default InteractionManager;

export { runAfterInteractions };
