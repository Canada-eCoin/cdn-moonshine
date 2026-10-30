#!/usr/bin/env bash
#
# Local build harness for the Canada eCoin mobile wallet.
#
#   ./commands/build/command.sh <subcommand> [options]
#
# WHY THIS EXISTS
#
# Every build in this repo used to mean a GitHub Actions dispatch: 20-40 minutes of
# round-trip per attempt, a run in the repo's public history for every experiment, and a
# 10 GB cache budget shared by both platforms. That is a terrible loop for upgrading React
# Native, where the normal state of affairs is "try something, watch it fail for a
# dependency reason, try again".
#
# This runs the same commands CI runs, on this machine, and dispatches nothing unless asked.
#
# WHAT IT CAN AND CANNOT DO
#
#   js, deps, android   fully local
#   ios-deps            the Podfile/pod-resolution half of iOS, if CocoaPods is present
#   ios                 NOT local. An iOS build needs macOS and Xcode; no amount of Linux
#                       gets you there. `ios` says so and offers to dispatch the workflow
#                       deliberately instead.
#
# NOTHING HERE NEEDS sudo
#
# Java comes from Android Studio's bundled JBR (/opt/android-studio/jbr), which has javac.
# The Android SDK installs its own missing pieces: Gradle auto-downloads the platforms,
# build-tools, NDK and CMake versions android/build.gradle pins, using the licence already
# accepted in ~/Android/Sdk/licenses. Caches live in ~/.gradle and survive between runs.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

ANDROID_DIR="$REPO/android"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
STUDIO_JBR="/opt/android-studio/jbr"

# CI pins JDK 17 (see .github/workflows/android-ci.yml). Report a mismatch rather than
# hide it: the whole point of a local builder is that a green local build predicts a green
# CI build.
CI_JDK_MAJOR=17

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
hr()   { printf '%s\n' "────────────────────────────────────────────────────────────"; }

# ---------------------------------------------------------------------------- java ----

# Resolution order, and why:
#   1. $JAVA_HOME, when it is a real JDK — respect the operator.
#   2. A JDK 17 in /usr/lib/jvm — exact parity with CI.
#   3. Android Studio's bundled JBR — present on this machine, and a full JDK.
# Anything else fails loudly instead of producing a confusing Gradle error.
resolve_java() {
	if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/javac" ]]; then
		printf '%s\n' "$JAVA_HOME"; return 0
	fi
	for d in /usr/lib/jvm/*17* /usr/lib/jvm/java-17*; do
		[[ -x "$d/bin/javac" ]] && { printf '%s\n' "$d"; return 0; }
	done
	sdkman_jdk="$(find "${HOME}/.sdkman/candidates/java" -maxdepth 1 -type d -name '*17*' 2>/dev/null | head -1)"
	[[ -n "$sdkman_jdk" && -x "$sdkman_jdk/bin/javac" ]] && { printf '%s\n' "$sdkman_jdk"; return 0; }
	[[ -x "$STUDIO_JBR/bin/javac" ]] && { printf '%s\n' "$STUDIO_JBR"; return 0; }
	return 1
}

java_major() { "$1/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1; }

with_java() {
	local jdk
	jdk="$(resolve_java)" || die "No JDK with javac found. Install one (apt install openjdk-21-jdk-headless) or set JAVA_HOME."
	export JAVA_HOME="$jdk"
	export ANDROID_HOME="$SDK"
	export ANDROID_SDK_ROOT="$SDK"
	export PATH="$JAVA_HOME/bin:$PATH"
	if [[ "$(java_major "$jdk")" != "$CI_JDK_MAJOR" ]]; then
		warn "using JDK $(java_major "$jdk") from $jdk — CI uses JDK $CI_JDK_MAJOR"
	fi
}

# --------------------------------------------------------------------------- doctor ----

# Compare what android/build.gradle pins against what is actually installed, so a build
# that is about to download a gigabyte of NDK says so first. Note the values are not
# consistently quoted in that file (buildToolsVersion is, compileSdkVersion is not), so
# strip quotes only when they are there.
pin() { grep -E "^[[:space:]]*$1[[:space:]]*=" "$ANDROID_DIR/build.gradle" | head -1 | sed -E 's/.*=[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/'; }

cmd_doctor() {
	bold "Local builder — readiness"
	hr

	bold "Repo"
	info "path: $REPO"
	info "branch: $(git rev-parse --abbrev-ref HEAD)  commit: $(git rev-parse --short HEAD)"
	[[ -n "$(git status --porcelain)" ]] && warn "working tree is dirty" || ok "working tree clean"

	bold "Node / yarn (CI uses node 22)"
	local nodev yarnv
	nodev="$(node -v 2>/dev/null || echo none)"
	yarnv="$(yarn -v 2>/dev/null || echo none)"
	[[ "$nodev" == v22* ]] && ok "node $nodev" || warn "node $nodev (CI uses 22.x)"
	[[ "$yarnv" != none ]] && ok "yarn $yarnv" || die "yarn missing"
	[[ -d node_modules ]] && ok "node_modules present ($(du -sh node_modules 2>/dev/null | cut -f1))" \
		|| warn "node_modules missing — run: $0 deps"

	bold "Java"
	local jdk
	if jdk="$(resolve_java)"; then
		local maj; maj="$(java_major "$jdk")"
		if [[ "$maj" == "$CI_JDK_MAJOR" ]]; then ok "JDK $maj — $jdk (matches CI)"
		else warn "JDK $maj — $jdk (CI uses $CI_JDK_MAJOR; Android Studio's JBR is the usual fallback)"
		fi
	else
		die "no JDK with javac found"
	fi

	bold "Android SDK  ($SDK)"
	if [[ ! -d "$SDK" ]]; then
		warn "not found — set ANDROID_HOME, or let Gradle download one"
	else
		info "platforms:   $(ls "$SDK/platforms" 2>/dev/null | tr '\n' ' ')"
		info "build-tools: $(ls "$SDK/build-tools" 2>/dev/null | tr '\n' ' ')"
		info "ndk:         $(ls "$SDK/ndk" 2>/dev/null | tr '\n' ' ')"
		info "cmake:       $(ls "$SDK/cmake" 2>/dev/null | tr '\n' ' ')"
		local want_bt want_sdk want_ndk
		want_bt="$(pin buildToolsVersion)"; want_sdk="$(pin compileSdkVersion)"; want_ndk="$(pin ndkVersion)"
		[[ -d "$SDK/build-tools/$want_bt" ]] && ok "build-tools $want_bt present" \
			|| warn "build-tools $want_bt missing — Gradle will download it on first build"
		[[ -d "$SDK/platforms/android-$want_sdk" ]] && ok "platform android-$want_sdk present" \
			|| warn "platform android-$want_sdk missing — Gradle will download it on first build"
		[[ -d "$SDK/ndk/$want_ndk" ]] && ok "ndk $want_ndk present" \
			|| warn "ndk $want_ndk missing — ~1 GB, Gradle will download it on first build"
		[[ -f "$SDK/licenses/android-sdk-license" ]] && ok "SDK licence accepted (needed for auto-download)" \
			|| warn "no accepted SDK licence — Gradle cannot auto-download components"
	fi

	bold "Caches"
	[[ -d "$HOME/.gradle" ]] && ok "~/.gradle ($(du -sh "$HOME/.gradle" 2>/dev/null | cut -f1))" \
		|| info "~/.gradle absent — first Gradle build will populate it"
	info "build cache: $(du -sh "$HOME/.gradle/caches/build-cache-1" 2>/dev/null | cut -f1 || echo absent)"

	bold "iOS"
	# Tested on 2026-10-10 in a Debian container with ruby 3.1 + cocoapods 1.17.0: pod
	# install dies in CocoaPods' own config.rb `unicode_normalize` while computing
	# installation_root, before it reads the Podfile, and setting LANG/LC_ALL=C.UTF-8 does
	# not help. Do not suggest 'apt install ruby' as a way to unlock this — it was tried
	# and it buys nothing.
	info "pod resolution cannot be checked here: CocoaPods does not run on Linux"
	info "  (Ruby + CocoaPods installed and tested 2026-10-10; it crashes in"
	info "   config.rb unicode_normalize before parsing the Podfile)" 
	case "$(uname -s)" in
		Darwin) ok "macOS — 'ios' can build here" ;;
		*)      warn "'ios' cannot build here: an iOS build needs macOS and Xcode"
		        info "  'ios --dispatch' runs it on GitHub instead (deliberately, not by accident)" ;;
	esac
	hr
}

# ----------------------------------------------------------------------------- deps ----

cmd_deps() {
	local update=0
	for a in "$@"; do [[ "$a" == "--update" ]] && update=1; done

	bold "Node dependencies"
	if [[ $update -eq 1 ]]; then
		info "yarn install (lockfile may change — upgrade mode)"
		yarn install
	else
		info "yarn install --frozen-lockfile (CI parity)"
		yarn install --frozen-lockfile
	fi
	ok "node dependencies"

	bold "iOS pods"
	if command -v pod >/dev/null 2>&1; then
		( cd ios && pod install )
		ok "pod install"
		# Podfile.lock is committed, so a local pod install that rewrites it is a change
		# worth noticing rather than a silent one.
		if ! git diff --quiet ios/Podfile.lock 2>/dev/null; then
			warn "ios/Podfile.lock changed — commit it deliberately, or discard with: git checkout ios/Podfile.lock"
		fi
	else
		warn "CocoaPods not installed; skipping. See 'doctor' for the two commands that add it."
	fi
}

# ------------------------------------------------------------------------------- js ----

cmd_js() {
	bold "JS gate (same commands as CI's verify job)"
	info "lint"; yarn lint
	info "test --ci"; yarn test --ci
	ok "lint + jest"
}

# -------------------------------------------------------------------------- android ----

cmd_android() {
	local variant="${1:-debug}"
	with_java
	resolve_find
	[[ -d "$ANDROID_DIR" ]] || die "no android/ directory"

	bold "Android build ($variant) on JDK $(java_major "$JAVA_HOME")"
	info "ANDROID_HOME=$ANDROID_HOME"
	bold "Gradle"
	local tasks=()
	case "$variant" in
		debug)   tasks=(assembleDebug) ;;
		release) tasks=(assembleRelease) ;;
		both)    tasks=(assembleDebug assembleRelease) ;;
		clean)   ( cd "$ANDROID_DIR" && ./gradlew clean ); ok "cleaned"; return 0 ;;
		*) die "unknown variant '$variant' (debug|release|both|clean)" ;;
	esac
	# The Gradle daemon is left running on purpose: repeat local builds are dramatically
	# faster with it warm, which is the entire point of building locally.
	( cd "$ANDROID_DIR" && ./gradlew "${tasks[@]}" )

	cmd_android_check "$variant"
}

# Mirrors the invariant checks CI performs, so "green locally" means "green in CI" rather
# than "the compiler stopped complaining".
cmd_android_check() {
	local variant="$1" bt out
	out="$ANDROID_DIR/app/build/outputs/apk"
	bt="$(find "$SDK/build-tools" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort -V | tail -1)"
	[[ -n "$bt" ]] || { warn "no build-tools; skipping artifact checks"; return 0; }

	bold "Artifact checks"
	if [[ "$variant" == "debug" || "$variant" == "both" ]] && [[ -f "$out/debug/app-debug.apk" ]]; then
		"$bt/apksigner" verify "$out/debug/app-debug.apk" >/dev/null 2>&1 \
			&& ok "debug APK is signed (installable)" \
			|| die "debug APK is NOT signed — it cannot be installed"
		"$bt/aapt2" dump badging "$out/debug/app-debug.apk" 2>/dev/null \
			| grep -E "^package:|^sdkVersion|^targetSdkVersion" | sed 's/^/    /' || true
	fi
	if [[ "$variant" == "release" || "$variant" == "both" ]] && [[ -f "$out/release/app-release-unsigned.apk" ]]; then
		if "$bt/apksigner" verify "$out/release/app-release-unsigned.apk" >/dev/null 2>&1; then
			die "release APK is SIGNED — it must be unsigned so whoever publishes signs it"
		else
			ok "release APK is unsigned (correct — see docs/SIGNING.md)"
		fi
		"$bt/aapt2" dump badging "$out/release/app-release-unsigned.apk" 2>/dev/null \
			| grep -E "^package:|^sdkVersion|^targetSdkVersion" | sed 's/^/    /' || true
	fi
}

# ------------------------------------------------------------------------------- ios ----

cmd_ios_deps() {
	bold "iOS pod resolution"
	if command -v pod >/dev/null 2>&1; then
		( cd ios && pod install )
		ok "pods resolved"
		git diff --quiet ios/Podfile.lock 2>/dev/null || warn "ios/Podfile.lock changed"
		return 0
	fi
	warn "not available on this machine, and not for want of CocoaPods being installed"
	info ""
	info "CocoaPods was installed and tested here on 2026-10-10 (ruby 3.1.2, cocoapods"
	info "1.17.0, in a Debian container). 'pod install' crashes inside CocoaPods' own"
	info "config.rb during unicode_normalize of installation_root, before it reads the"
	info "Podfile. LANG/LC_ALL=C.UTF-8 does not help. CocoaPods expects macOS."
	info ""
	info "So the iOS dependency loop has to happen where Xcode is:"
	info "  $0 ios --dispatch     run the real build on GitHub on purpose"
	info ""
	info "That is why the pod failures on 2026-10-09 (use_flipper!, the lottie-ios pin)"
	info "each cost a full CI run to discover: there is no local equivalent."
	return 3
}

cmd_ios() {
	if [[ "${1:-}" == "--dispatch" ]]; then
		bold "Dispatching the iOS workflow on GitHub"
		info "this is the only way to build iOS from this machine — it needs macOS and Xcode"
		gh workflow run "iOS build (manual)" --ref "$(git rev-parse --abbrev-ref HEAD)" \
			|| die "dispatch failed (is gh authenticated, and is the branch pushed?)"
		sleep 5
		gh run list --workflow ios.yml --limit 3
		return 0
	fi
	bold "iOS builds cannot be done locally"
	info "an iOS build needs macOS, Xcode and the iOS SDK. No Linux toolchain substitutes."
	info ""
	info "what you cannot do here, and why:"
	info "  pod resolution needs CocoaPods, which does not run on Linux — see: $0 ios-deps"
	info "  (installed and tested 2026-10-10; it crashes before reading the Podfile)"
	info "  $0 ios --dispatch    run the real build on GitHub on purpose, not by accident"
	info ""
	info "what CI then gives you, and why it is worth a deliberate dispatch:"
	info "  * a simulator .app, a boot smoke test, and an unsigned .xcarchive"
	info "  * the iOS entry point currently crashes on launch (RNBootSplash vs the legacy"
	info "    AppDelegate — upstream zoontek/react-native-bootsplash#794). The smoke test"
	info "    will fail until that is fixed, which is the correct behaviour."
	exit 3
}

# ------------------------------------------------------------------------------- all ----

# Metro's file crawler shells out to `find` — it logs "Using system find: true" — and on
# this kingdom `find` in PATH is the kingdom-safe wrapper, which prunes node_modules
# before traversal. The crawler therefore returns ~326 files (the project, no
# dependencies), every bare specifier fails to resolve, and the failure reads exactly
# like a broken bundler.
#
# Measured 2026-10-30: the crawler reported 326 files against a node_modules holding
# ~100k. `find node_modules -maxdepth 1 -type d` returns 0 entries through the wrapper
# and 789 through /usr/bin/find. With the system binary first in PATH the release bundle
# builds in 18s and contains the app graph.
#
# That also explains the earlier "reproducible on 0.78.2 and 0.79" observation: it was
# never version-related, and CI was never special — CI simply has a normal `find`.
#
# The wrapper is correct for agent searches and wrong for a build tool, so this puts the
# system binary first for the rest of the run rather than asking every operator to
# remember PATH.
resolve_find() {
	local probe="$REPO/node_modules"
	[[ -d "$probe" ]] || return 0
	# maxdepth 0 prints the directory itself; a wrapper that prunes it prints nothing.
	if [[ -z "$(find "$probe" -maxdepth 0 2>/dev/null)" ]]; then
		local shim="${TMPDIR:-/tmp}/koad-build-realfind"
		mkdir -p "$shim"
		ln -sf /usr/bin/find "$shim/find"
		export PATH="$shim:$PATH"
		warn "PATH 'find' prunes node_modules (kingdom-safe wrapper) — using /usr/bin/find"
		info "  Metro's crawler shells out to find; without this it sees only project files"
	fi
}

cmd_bundle() {
	resolve_find
	bold "JS bundle (Metro, release mode)"
	local out="${TMPDIR:-/tmp}/koad-js-bundle"
	rm -rf "$out"
	mkdir -p "$out"
	info "index.js -> $out/index.android.bundle"
	( cd "$REPO" && npx react-native bundle \
		--platform android \
		--dev false \
		--entry-file index.js \
		--bundle-output "$out/index.android.bundle" \
		--assets-dest "$out/assets" )
	[[ -s "$out/index.android.bundle" ]] || die "bundle output missing or empty"
	ok "bundle written ($(wc -c < "$out/index.android.bundle") bytes)"

	# A bundle that resolved nothing can still exit 0. Check the app is actually in it,
	# and that assets were collected, so this step cannot go quietly hollow again.
	local marker
	for marker in AppRegistry coincore; do
		grep -q "$marker" "$out/index.android.bundle" \
			|| die "bundle is missing '$marker' — module resolution failed again"
	done
	[[ -n "$(ls -A "$out/assets" 2>/dev/null)" ]] || die "no assets were copied"
	ok "bundle contains the app graph and assets"
}

cmd_all() {
	cmd_js
	cmd_bundle
	cmd_android debug
}

usage() {
	cat <<EOF
$(bold "mobile local builder")

  ./commands/build/command.sh <subcommand> [options]

$(bold "subcommands")
  doctor              what is installed, what CI expects, what is missing
  deps [--update]     yarn install (frozen unless --update); pod install on macOS only
  js                  lint + jest, exactly as CI's verify job runs them
  android [variant]   debug (default) | release | both | clean — then artifact checks
  ios-deps            why pod resolution cannot be checked locally (CocoaPods is macOS-only)
  ios                 why this cannot be local; --dispatch to run it on GitHub
  bundle              release JS bundle (Metro) — the step a release APK needs
  verify              js + bundle + android debug — the "is this branch sane" command
  all                 js + bundle + android debug

$(bold "notes")
  * nothing here needs sudo; Java comes from Android Studio's bundled JBR
  * no GitHub Actions run is created unless you pass --dispatch
  * caches persist in ~/.gradle, so repeat builds are much faster than the first
EOF
}

case "${1:-}" in
	doctor)    cmd_doctor ;;
	deps)      shift; cmd_deps "$@" ;;
	js)        cmd_js ;;
	android)   shift; cmd_android "$@" ;;
	bundle)    cmd_bundle ;;
	ios-deps)  cmd_ios_deps ;;
	ios)       shift; cmd_ios "$@" ;;
	verify)    cmd_js; cmd_bundle; cmd_android debug ;;
	all)       cmd_all ;;
	""|-h|--help|help) usage ;;
	*)         die "unknown subcommand '$1' (run with no arguments for usage)" ;;
esac
