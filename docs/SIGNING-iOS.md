# Signing and publishing an iOS build

Companion to [`SIGNING.md`](./SIGNING.md), which covers Android. Read this one first if
you are expecting the Android story to carry over — **it does not.**

## The hard difference from Android

On Android, the CI produces an unsigned APK and *anyone who holds a key* can sign it and
publish it. There is no equivalent on iOS:

- iOS refuses to launch an app whose code signature does not match a provisioning
  profile. This is enforced by the OS, not by a store.
- A provisioning profile is issued by Apple and bound to a specific **Apple Developer
  account**, a **certificate**, and (for development/Ad Hoc) a list of **device UDIDs**.
- Therefore *anyone* can sign — but only anyone with an Apple Developer account, and the
  profile they can produce is limited by what that account is allowed to do.

So the honest split is:

| what CI produces | who can use it | what it's for |
|---|---|---|
| `…-simulator.app.zip` | anyone, no account | run it in the iOS Simulator; proves the app builds, links and boots |
| `…-unsigned.xcarchive.zip` | anyone holding a certificate + profile | sign it yourself and export an `.ipa` for a device |

There is no "install this APK" step for iOS, and there is no third path where a build
with no signature ends up on a phone.

## 1. Get a build

```bash
gh workflow run "iOS build (manual)" --ref master
gh run list --workflow ios.yml --limit 5
gh run download <run-id> --dir dist/
cd dist && shasum -a 256 -c SHA256SUMS
```

The run summary carries the toolchain versions (Xcode, CocoaPods, Ruby, Node) and the
full commit SHA, because an artifact is only meaningful next to the source that produced
it.

## 2. Run the simulator build (no account needed)

Unzip, then either drag the `.app` onto a booted Simulator, or:

```bash
xcrun simctl boot "iPhone 16"        # any installed simulator
open -a Simulator
xcrun simctl install booted moonshine.app
xcrun simctl launch booted com.kisswallet
```

Note the bundle id: the app target currently ships **`com.kisswallet`**, which is the
upstream Moonshine author's identifier, not this project's. See §5.

## 3. Sign the archive yourself

### Path A — Xcode (recommended, and what Apple supports)

1. Unzip `…-unsigned.xcarchive.zip`.
2. `open moonshine.xcarchive`.
3. **Distribute App** → pick a method (App Store Connect / Ad Hoc / Development) → let
   Xcode manage signing with your team → Export.

Xcode will attach your certificate and a profile it creates for you. This is the path
with the fewest ways to go wrong, and it is the only one that handles the newer
export-compliance and App Store Connect upload flows for you.

### Path B — command line

You need your certificate as a `.p12` and a profile. Import them into a temporary
keychain so they do not touch the default one:

```bash
security create-keychain -p "" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain
security import cert.p12 -k build.keychain -P "$P12_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain

mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
cp profile.mobileprovision "$HOME/Library/MobileDevice/Provisioning Profiles/"
```

Then export, re-signing the app that CI built:

```bash
xcodebuild -exportArchive \
  -archivePath moonshine.xcarchive \
  -exportPath out \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```

with `ExportOptions.plist` something like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>          <string>app-store-connect</string> <!-- or ad-hoc / development -->
  <key>teamID</key>          <string>YOURTEAMID</string>
  <key>signingStyle</key>    <string>manual</string>
  <key>uploadSymbols</key>   <true/>
  <key>compileBitcode</key>  <false/>
</dict>
</plist>
```

`security delete-keychain build.keychain` when you are done.

### Verify before you ship

```bash
codesign -dv --verbose=4 out/moonshine.app     # check the signing identity and team
codesign --verify --deep --strict out/moonshine.app
xcrun altool --validate-app -f out/moonshine.ipa -t ios -u "$APPLE_ID" -p "$APP_PASSWORD"
```

If `codesign -dv` shows your team and a valid signature, the build corresponds to the
commit in the run summary.

## 4. Publishing channels

| channel | requirement |
|---|---|
| **App Store / TestFlight** | Apple Developer Program (paid, annual). Upload the `.ipa` (or use Xcode's Distribute → App Store Connect). |
| **Ad Hoc** | paid account, plus every device's UDID registered, profile regenerated, 100 devices per type per year. |
| **Development** | works with a free Apple ID, signs for your own devices only, expires after 7 days. |
| **Enterprise (in-house)** | Apple Developer Enterprise Program, separate application, strict eligibility. |
| **Sideloading tools** | not a channel. They re-sign with *their* certificate; the artifact here is irrelevant to them. |

For a wallet, note that App Store review will ask what your app does with keys and
whether it is custodial. Have that answer ready.

## 5. Before you publish — this project's current identity

| item | current value | source | consequence |
|---|---|---|---|
| bundle identifier (app target) | **`com.kisswallet`** | `project.pbxproj` | the upstream author's identifier — you cannot publish under it |
| bundle identifier (project default) | `org.reactjs.native.example.$(PRODUCT_NAME…)` | `project.pbxproj` | the React Native template placeholder |
| `MARKETING_VERSION` | `0.4.0` | `project.pbxproj` | while Android says `1.0` and `package.json` says `0.7.2` — three sources of truth |
| `CURRENT_PROJECT_VERSION` | `1` | `project.pbxproj` | must increase for every TestFlight/App Store build |
| iOS deployment target | `15.1` | `project.pbxproj` | raised from `10.0`/`11.0` in this change, to match React Native 0.78's minimum |
| new architecture | on | React Native 0.78 default | matches the Android side (`newArchEnabled=true`) |
| `NSAllowsArbitraryLoads` | `true` | `Info.plist` | App Review requires a justification for this; it is here because of plain-HTTP price/peer endpoints. Expect to answer for it, or narrow it to specific domains. |

Usage descriptions are already present (`NSCameraUsageDescription`,
`NSFaceIDUsageDescription`, `NSMicrophoneUsageDescription`), so the QR scanner and the
biometric unlock will not be rejected for a missing purpose string.

## 6. What changed to make any of this buildable

The iOS project was five React Native majors behind the JavaScript. For the record, in
case you bisect an iOS problem back to here:

- the Podfile called `use_flipper!` / `flipper_post_install`, removed from React Native
  in 0.73 — `pod install` cannot even parse the old file;
- `platform :ios, '10.0'` against React Native 0.78's required `15.1`;
- `config["reactNativePath"]` (string key) where `use_native_modules!` returns a symbol
  key, so the value was `nil`;
- no `react_native_post_install`, so the per-pod build-setting patches were never
  applied;
- `ios/Podfile.lock` pinned **React 0.63.3** and pods from the pre-fork upstream
  (`react-native-camera`, `react-native-blur`, `react-native-netinfo` 5.x) that no longer
  exist in `package.json` at all — it was deleted, and CI now uploads the freshly
  resolved lock so it can be committed deliberately.

The iOS app had not been built since before the fork. Treat the first successful run as
the beginning of iOS support, not as a regression check.
