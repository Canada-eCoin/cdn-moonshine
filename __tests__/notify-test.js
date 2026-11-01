/**
 * The point of notify() over alert() is that both the user and a test can see it.
 * These assertions cover that contract: the event reaches a subscriber, the message
 * survives into a greppable trace line, and confirm() resolves instead of blocking.
 */
import { notify, confirm, subscribe, dismiss } from "../src/utils/notify";

describe("notify", () => {
	let events;
	let unsubscribe;

	beforeEach(() => {
		events = [];
		unsubscribe = subscribe((event) => events.push(event));
	});

	afterEach(() => {
		unsubscribe();
		jest.restoreAllMocks();
	});

	test("raises a banner event with the level and an auto-dismiss window", () => {
		const id = notify("Unable to connect to an electrum server.");
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			type: "notify",
			id,
			message: "Unable to connect to an electrum server.",
			level: "info",
		});
		expect(events[0].timeout).toBeGreaterThan(0);
	});

	test("errors are marked and stay longer than info", () => {
		notify("boom", { level: "error" });
		notify("fyi", { level: "info" });
		expect(events[0].level).toBe("error");
		expect(events[0].timeout).toBeGreaterThan(events[1].timeout);
	});

	test("writes a single-line [notify] trace for logcat", () => {
		const log = jest.spyOn(console, "log").mockImplementation(() => {});
		notify("line one\nline two");
		const trace = log.mock.calls.find((call) => call[0] === "[notify]");
		expect(trace).toBeTruthy();
		expect(trace[2]).toBe("line one line two");
	});

	test("dismiss carries the banner id", () => {
		const id = notify("temporary");
		events.length = 0;
		dismiss(id);
		expect(events[0]).toEqual({ type: "dismiss", id });
	});

	test("confirm resolves true when accepted and false when cancelled", async () => {
		const accepted = confirm("Delete wallet?", { confirmText: "Yes", cancelText: "No", destructive: true });
		expect(events[0]).toMatchObject({ type: "confirm", confirmText: "Yes", cancelText: "No", destructive: true });
		events[0].resolve(true);
		await expect(accepted).resolves.toBe(true);

		events.length = 0;
		const cancelled = confirm("Delete wallet?");
		events[0].resolve(false);
		await expect(cancelled).resolves.toBe(false);
	});

	test("a listener that throws does not stop the others", () => {
		const received = [];
		const off = subscribe(() => {
			throw new Error("listener blew up");
		});
		const clean = subscribe((event) => received.push(event));
		jest.spyOn(console, "log").mockImplementation(() => {});
		expect(() => notify("still delivered")).not.toThrow();
		expect(received).toHaveLength(1);
		off();
		clean();
	});
});
