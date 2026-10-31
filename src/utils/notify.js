/**
 * In-app notifications.
 *
 * The app used the global `alert()` in 66 places. That is a native dialog: it blocks the
 * JS thread, it is a separate OS window, and it leaves nothing behind once dismissed —
 * which means a failure that only shows as an alert is invisible to a test, to logcat
 * scraping, and to anyone driving the app over adb.
 *
 * This replaces it with two calls:
 *
 *   notify(message, { level })      a banner. Non-blocking, auto-dismisses, and logs
 *                                   `[notify] <level> <message>` so it is greppable.
 *   confirm(message, options)       a modal that resolves instead of blocking, for the
 *                                   places that genuinely need a decision.
 *
 * Both emit through `subscribe`, which NotifyHost listens to. Keeping the bus in a plain
 * module (rather than context) means non-component code — reducers, helpers, catch
 * blocks — can raise a notification without being inside the tree.
 */

const listeners = new Set();

let sequence = 0;

// Auto-dismiss windows, in ms. Errors stay longer because they usually carry an action
// ("check your connection and try again") that the reader needs time for.
const DISMISS_MS = { info: 4000, success: 4000, warning: 6000, error: 7000 };

const emit = (event) => {
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (e) {
			console.log("[notify] listener failed", e);
		}
	}
};

// One line, whitespace-collapsed, so logcat and uiautomator both get something stable to
// match on even when the message was a multi-line template literal.
const trace = (kind, level, message) => {
	try {
		const flat = String(message == null ? "" : message).replace(/\s+/g, " ").trim();
		console.log(`[${kind}]`, level, flat.slice(0, 500));
	} catch (e) {}
};

const notify = (message, { level = "info" } = {}) => {
	const text = String(message == null ? "" : message);
	trace("notify", level, text);
	const id = ++sequence;
	emit({
		type: "notify",
		id,
		message: text,
		level,
		timeout: DISMISS_MS[level] || DISMISS_MS.info,
	});
	return id;
};

/**
 * Resolves true when the confirming button is pressed, false for cancel or dismissal.
 * `cancelText: null` renders a single button, which is the "longer alert" case.
 */
const confirm = (message, { confirmText = "OK", cancelText = null, destructive = false } = {}) => {
	const text = String(message == null ? "" : message);
	trace("confirm", destructive ? "warning" : "info", text);
	const id = ++sequence;
	return new Promise((resolve) => {
		emit({ type: "confirm", id, message: text, confirmText, cancelText, destructive, resolve });
	});
};

const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

// Dismiss a specific banner (the host calls this on tap and on timeout).
const dismiss = (id) => emit({ type: "dismiss", id });

export default notify;
export { notify, confirm, subscribe, dismiss };
