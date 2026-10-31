/**
 * One app, one version.
 *
 * Before this test, the same build answered to three different versions: package.json
 * said 0.7.2, the Android APK said 1.0, and the iOS archive said 0.4.0. Nothing failed —
 * a version is metadata, so drift is silent until a store upload is rejected or someone
 * tries to match a crash report to a release.
 *
 * package.json is the single source. Android reads it at build time; iOS cannot, so
 * `MARKETING_VERSION` is duplicated in the Xcode project and checked here instead.
 * `versionCode` / `CURRENT_PROJECT_VERSION` are derived the same way on both sides:
 * major*10000 + minor*100 + patch, which increases with every release.
 */
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

const { version } = require("../package.json");

const expectedVersionCode = (() => {
	const [major, minor, patch] = version.split(".").map(Number);
	return major * 10000 + minor * 100 + patch;
})();

describe("app version", () => {
	test("package.json carries a plain semantic version", () => {
		expect(version).toMatch(/^\d+\.\d+\.\d+$/);
	});

	test("the iOS project agrees with package.json", () => {
		const project = read("ios/moonshine.xcodeproj/project.pbxproj");
		const marketing = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1]);
		const build = [...project.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => m[1]);

		expect(marketing.length).toBeGreaterThan(0);
		expect(build.length).toBeGreaterThan(0);
		// Debug and Release must not disagree with each other, or with package.json.
		expect([...new Set(marketing)]).toEqual([version]);
		expect([...new Set(build)]).toEqual([String(expectedVersionCode)]);
	});

	test("Android derives its version instead of hardcoding one", () => {
		const gradle = read("android/app/build.gradle");

		// Reading package.json is the contract; a quoted literal here is the drift.
		expect(gradle).toMatch(/package\.json/);
		expect(gradle).toMatch(/versionName\s+packageJson\.version/);
		expect(gradle).toMatch(/versionCode\s+appVersionCode/);
		expect(gradle).not.toMatch(/versionName\s+["']/);
		expect(gradle).not.toMatch(/versionCode\s+\d/);
	});
});
