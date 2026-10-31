/**
 * Regression tests for the three faults that let a wallet look alive while it could not
 * sync, plus the settle-every-time guarantee those faults kept hiding behind.
 *
 * All three were found on hardware, cost a phone and an emulator to locate, and every
 * one of them survived a fully green test suite. That is the reason this file exists:
 * each test below fails against the code that shipped the bug.
 *
 *   1. A successful connection was thrown away. `connect()` resolves with no value, so
 *      the peer had to be handed back explicitly; without that, connectToRandomPeer
 *      treated every successful connect as a failure and reported "Unable to connect to
 *      an electrum server" on every network.
 *   2. Method names came from `Function.caller`, which is a TypeError in strict mode.
 *      ES modules are strict and RN 0.88's Hermes enforces it, so ~32 methods threw
 *      before their own try/catch could run.
 *   3. `server.version` was not sent during the handshake. ElectrumX 1.x tolerates that;
 *      ElectrumX 2.x (the eGulden servers) silently ignores every later request, so the
 *      socket connected and then nothing answered.
 *
 * The Electrum client is mocked, so nothing here touches the network.
 */

const mockCalls = [];

jest.mock("../src/utils/electrum/client", () => {
	return class FakeElectrumClient {
		constructor(net, tls, port, host, protocol) {
			this.port = port;
			this.host = host;
			this.protocol = protocol;
			mockCalls.push({ method: "constructor", port, host, protocol });
		}

		connect() {
			mockCalls.push({ method: "connect" });
			return Promise.resolve();
		}

		server_version(client, version) {
			mockCalls.push({ method: "server_version", client, version });
			return Promise.resolve(["FakeElectrum 1.0", "1.4"]);
		}

		server_ping() {
			mockCalls.push({ method: "server_ping" });
			return Promise.resolve(null);
		}

		close() {
			return Promise.resolve();
		}

		blockchainScripthash_getBalance() {
			return Promise.resolve({ confirmed: 1234, unconfirmed: 0 });
		}

		blockchainAddress_getBalance() {
			return Promise.resolve({ confirmed: 42, unconfirmed: 0 });
		}

		blockchainBlock_getBlockHeader() {
			return Promise.resolve("0100");
		}
	};
});

const electrum = require("../src/utils/electrum");
const clients = require("../src/utils/electrum/clients");
const peers = require("../src/utils/electrum/peers.json");
const { networks } = require("../src/utils/networks");

const COIN = "bitcoin";
const CUSTOM_PEER = { host: "peers.example.org", port: 50002, protocol: "ssl" };

/** Reject instead of hanging when a promise never settles — the whole point of test 4. */
const settle = (promise, ms = 2000) => {
	let timer;
	const guard = new Promise((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error("promise never settled")), ms);
	});
	return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
};

const connect = () => electrum.start({ coin: COIN, customPeers: [CUSTOM_PEER] });

afterEach(async () => {
	// stop() clears the module-level keep-alive interval; without it Jest holds the
	// process open for a minute.
	for (const coin of Object.keys(networks)) {
		try {
			await electrum.stop({ coin });
		} catch {}
		clients.mainClient[coin] = false;
		clients.peers[coin] = [];
	}
	mockCalls.length = 0;
});

describe("connection handling", () => {
	test("a successful connection is kept, not discarded", async () => {
		const response = await settle(electrum.start({ coin: COIN }));

		expect(response.error).toBe(false);
		// The bug: `data` was undefined here, so connectToRandomPeer discarded the peer
		// and the app reported that it could not reach any server.
		expect(response.data).toBeTruthy();
		expect(response.data).toMatchObject({ host: expect.any(String), port: expect.any(Number) });
	});

	test("a coin with no reachable peers fails cleanly instead of throwing", async () => {
		const response = await settle(electrum.start({ coin: "emark" }));

		expect(response.error).toBe(true);
		expect(clients.mainClient.emark).toBeFalsy();
	});
});

describe("handshake", () => {
	test("server.version is sent during the handshake, before any other request", async () => {
		await settle(connect());

		const methods = mockCalls.map((call) => call.method);
		// The constructor is recorded too; what matters is that connect() is followed
		// immediately by server.version, with no other request in between.
		const afterConnect = methods.slice(methods.indexOf("connect"));
		expect(afterConnect.slice(0, 2)).toEqual(["connect", "server_version"]);
		expect(mockCalls[methods.indexOf("server_version")]).toMatchObject({
			client: "moonshine/1.0",
			version: "1.4",
		});
	});

	test("the connected peer is recorded so reconnects target the server that worked", async () => {
		await settle(connect());

		expect(clients.peer[COIN]).toMatchObject(CUSTOM_PEER);
	});
});

describe("method names", () => {
	test("RPC methods label themselves without Function.caller", async () => {
		await settle(connect());

		const response = await settle(
			electrum.getAddressScriptHashBalance({ scriptHash: "00".repeat(32), coin: COIN }),
		);

		expect(response.error).toBe(false);
		expect(response.data).toEqual({ confirmed: 1234, unconfirmed: 0 });
		// Under the old implementation this line never ran: the method threw a TypeError
		// at its first statement, in strict mode, before any try/catch.
		expect(response.method).toBe("getAddressScriptHashBalance");
	});
});

describe("every RPC settles", () => {
	// These two returned a value from inside the Promise executor instead of calling
	// resolve(), so the promise never settled: the caller awaited forever. getAddressBalance
	// and getHeader are both exported, so both were reachable from the app.
	test("getAddressBalance resolves with its data", async () => {
		await settle(connect());

		const response = await settle(electrum.getAddressBalance({ address: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT", coin: COIN }));

		expect(response.error).toBe(false);
		expect(response.data).toEqual({ confirmed: 42, unconfirmed: 0 });
		expect(response.method).toBe("getAddressBalance");
	});

	test("getHeader resolves with the header", async () => {
		await settle(connect());

		const response = await settle(electrum.getHeader({ height: 1, coin: COIN }));

		expect(response.error).toBe(false);
		expect(response.data).toBe("0100");
	});
});

describe("hardcoded peers", () => {
	test("every coin the UI offers has a peer list", () => {
		// Deleting a key makes getDefaultPeers throw a TypeError, so the empty list for
		// eMark has to stay present rather than be removed.
		for (const coin of Object.keys(networks)) {
			expect(Array.isArray(peers[coin])).toBe(true);
		}
	});

	test("getAvailablePeers returns a list for every coin, including the empty one", async () => {
		for (const coin of Object.keys(networks)) {
			const response = await settle(electrum.getAvailablePeers({ coin }));
			expect(response.error).toBe(false);
			expect(Array.isArray(response.data)).toBe(true);
		}
	});

	test("each peer carries a host and a port for its protocol", () => {
		for (const coin of Object.keys(peers)) {
			for (const peer of peers[coin]) {
				expect(typeof peer.host).toBe("string");
				expect(peer.host.length).toBeGreaterThan(0);
				// peers.json lists both transports; at least one has to be usable.
				expect(Math.max(peer.ssl || 0, peer.tcp || 0)).toBeGreaterThan(0);
			}
		}
	});
});

describe("method labels", () => {
	// The label is what a caller switches on and what a log line carries, so a wrong one
	// is worse than none. Reading it off the stack produced "getFuncName" for every
	// method; this asserts each RPC declares its own name instead.
	const fs = require("fs");
	const path = require("path");
	const source = fs.readFileSync(path.join(__dirname, "../src/utils/electrum/index.js"), "utf8");

	const block = (name) => {
		const start = source.indexOf(`const ${name} = `);
		expect(start).toBeGreaterThan(-1);
		const end = source.indexOf("\nconst ", start + 1);
		return source.slice(start, end === -1 ? undefined : end);
	};

	// `start()` is a connection orchestrator, not an RPC: it reports the method it drives.
	const RENAMED = { start: "connectToPeer" };

	test("every RPC that declares a label declares its own name", () => {
		const labelled = Object.keys(electrum).filter(
			(name) => typeof electrum[name] === "function" && block(name).includes("const method = "),
		);

		expect(labelled.length).toBeGreaterThan(20);
		for (const name of labelled) {
			expect({ name, label: block(name).match(/const method = "([^"]+)"/)[1] }).toEqual({
				name,
				label: RENAMED[name] || name,
			});
		}
	});
});
