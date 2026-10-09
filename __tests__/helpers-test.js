/**
 * @format
 *
 * Behavioural tests for the pure helpers the wallet leans on: value formatting,
 * fiat/satoshi conversion, string parsing and derivation paths. These run in
 * milliseconds and need no device — which is exactly why they belong in CI on every
 * manual run, next to the APK build.
 *
 * Assertions are written against intent (what the function is for), not against
 * whatever the implementation happens to do.
 */
import {
	formatNumber,
	capitalize,
	getLastWordInString,
	nthIndex,
	removeDecimals,
	satsToBtc,
	getBaseDerivationPath,
	shuffleArray,
} from "../src/utils/helpers";

describe("formatNumber", () => {
	it("groups integer thousands with commas", () => {
		expect(formatNumber("1234567")).toBe("1,234,567");
		expect(formatNumber(1000)).toBe("1,000");
	});

	it("does not disturb the decimal places", () => {
		expect(formatNumber("1234.56")).toBe("1,234.56");
		expect(formatNumber("0.12345678")).toBe("0.12345678");
	});
});

describe("capitalize", () => {
	it("upper-cases the first letter", () => {
		expect(capitalize("canadaecoin")).toBe("Canadaecoin");
	});

	it("splits a run of capitals into its own word", () => {
		expect(capitalize("canadaECoin")).toBe("Canada ECoin");
	});

	it("returns an empty string unchanged", () => {
		expect(capitalize("")).toBe("");
	});
});

describe("getLastWordInString", () => {
	it("returns the last word of a phrase", () => {
		expect(getLastWordInString("my recovery phrase")).toBe("phrase");
	});
});

describe("nthIndex", () => {
	it("finds the first and second occurrence", () => {
		expect(nthIndex("a/b/c", "/", 1)).toBe(1);
		expect(nthIndex("a/b/c", "/", 2)).toBe(3);
	});
});

describe("removeDecimals", () => {
	// Name is misleading: it removes *extra* decimal points, keeping the first one as
	// the decimal separator. Recorded here because this is genuinely what it does.
	it("collapses a second decimal point into the first group", () => {
		expect(removeDecimals("1.2.3")).toBe("1.23");
	});

	it("leaves a single decimal point alone", () => {
		expect(removeDecimals("1.234")).toBe("1.234");
		expect(removeDecimals("1234")).toBe("1234");
	});
});

describe("satsToBtc", () => {
	it("converts satoshi to BTC", () => {
		expect(satsToBtc({ amount: 100000000 })).toBe(1);
		expect(satsToBtc({ amount: 1000 })).toBe(0.00001);
	});
});

describe("getBaseDerivationPath", () => {
	it("builds an m/purpose'/coinType'/... path for bitcoin", () => {
		expect(getBaseDerivationPath({ keyDerivationPath: "84", selectedCrypto: "bitcoin" })).toBe(
			"m/84'/0'/0'/0/0",
		);
	});

	it("uses the coin's registered coin type", () => {
		// canadaecoin -> 34 (see defaultWalletShape.coinTypePath in src/utils/networks.js)
		expect(getBaseDerivationPath({ keyDerivationPath: "84", selectedCrypto: "canadaecoin" })).toBe(
			"m/84'/34'/0'/0/0",
		);
	});
});

describe("shuffleArray", () => {
	it("keeps the same members", () => {
		const out = shuffleArray([1, 2, 3, 4, 5]);
		expect(out).toHaveLength(5);
		expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
	});
});
