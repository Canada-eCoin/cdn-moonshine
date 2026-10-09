# Signing and publishing a Canada eCoin mobile build

> **iOS is different.** This document covers Android. iOS cannot install an unsigned
> build at all — Apple gates signing behind a developer account, so there is no
> "anyone with a key can sign it" path. See [`SIGNING-iOS.md`](./SIGNING-iOS.md) before
> assuming any of the below carries over.

This repo builds **unsigned** (and debug-key-signed) APKs. It does not hold signing
keys, and it does not publish to any store. Signing and publishing are deliberate acts
performed by a person who holds a key — not a side effect of a pull request, and not a
side effect of a tag.

```
        CI builds              you download            you sign                 you publish
  ┌────────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌────────────────────┐
  │ app-debug.apk      │──▶│ verify sha256    │──▶│ your own keystore│──▶│ Play / Releases /   │
  │ app-release-        │   │ git verify commit│   │ zipalign+apksigner│  │  F-Droid / direct   │
  │   unsigned.apk     │   └──────────────────┘   └──────────────────┘   └────────────────────┘
  └────────────────────┘
   no keys held here
```

## Why GitHub holds no keys

Signing keys are not stored in this repository, are not stored in GitHub Actions
secrets, and are never transmitted to the runner. A signing key is the only thing that
makes an update to an installed app legitimate — whoever holds it can ship code to your
users. GitHub's secret storage has been the entry point for real compromises in other
projects, and the value of storing a wallet-signing key there is zero: nothing about
building an APK requires it.

The workflow `.github/workflows/android-ci.yml` contains **no `secrets.*` reference at
all**, and it runs on `workflow_dispatch` only — somebody has to ask it to build.

> `android/app/debug.keystore` *is* committed. That is the standard public Android debug
> keystore (`androiddebugkey`, password `android`) that every React Native template
> ships. It exists so debug builds install. It must never sign anything you distribute —
> and since this change, it no longer signs the release build either.

## 1. Get a build

From the repo's **Actions** tab → *Android build (manual)* → **Run workflow**, choose
`both` / `debug-only` / `release-only`, then wait for the run.

The run summary carries the commit SHA and the SHA-256 of every artifact. Download from
the run's *Artifacts* section, or from the command line:

```bash
gh run list --workflow android-ci.yml --limit 5
gh run download <run-id> --dir dist/
cd dist
sha256sum -c SHA256SUMS
```

| artifact | what it is | good for |
|---|---|---|
| `…-debug.apk` | `assembleDebug`, signed with the committed debug keystore | installing on a test device only |
| `…-release-unsigned.apk` | `assembleRelease`, **no signature at all** | signing with your own key and publishing |

**Record the commit.** An artifact is only meaningful next to the exact source it came
from — that is why the run summary prints `git rev-parse HEAD`:

```bash
git clone https://github.com/Canada-eCoin/cdn-moonshine.git
cd cdn-moonshine && git checkout <the SHA from the run summary>
```

## 2. Make your own keystore

If you are the publisher, you own the key. Generate it once, then guard it like the
private key it is.

```bash
keytool -genkeypair -v \
  -keystore release.jks \
  -alias cdn \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12
```

- **Back it up, off the machine, in more than one place.** If you lose it you cannot
  update your app again — Google Play will not let you re-upload under a new key unless
  you are enrolled in Play App Signing and file a key reset.
- Never commit it. `release.jks` is not in `.gitignore` by accident-proofing — add it
  yourself if you keep it in the working tree, and never `git add -f` it.
- Keep the password somewhere that is not the same place as the keystore.

## 3. Sign the APK you downloaded

Two tools from the Android SDK build-tools. `zipalign` first (alignment is required
before signing, and signing after aligning keeps the alignment valid), then `apksigner`.

```bash
BT="$ANDROID_HOME/build-tools/35.0.0"

# 1. align
"$BT/zipalign" -p -f 4 \
  cdn-moonshine-<date>-<sha>-release-unsigned.apk \
  cdn-aligned.apk

# 2. sign (apksigner asks for the keystore password interactively)
"$BT/apksigner" sign \
  --ks release.jks --ks-key-alias cdn \
  --v1-signing-enabled true --v2-signing-enabled true \
  --out cdn-moonshine-signed.apk \
  cdn-aligned.apk

# 3. prove it
"$BT/apksigner" verify --print-certs -v cdn-moonshine-signed.apk
```

`apksigner verify` must print `Verifies` for v1 and v2 and show **your** certificate
subject. If it shows `CN=Android Debug`, you signed the wrong file.

## 4. Or build and sign from source in one step

Gradle can sign during the release build, taking the key from command-line properties,
so no key file ever needs to exist inside the checkout:

```bash
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=/absolute/path/to/release.jks \
  -Pandroid.injected.signing.store.password='…' \
  -Pandroid.injected.signing.key.alias=cdn \
  -Pandroid.injected.signing.key.password='…'
```

The output lands in `android/app/build/outputs/apk/release/`. The same properties work
with `bundleRelease`, which produces the `.aab` Google Play wants:

```bash
./gradlew bundleRelease -Pandroid.injected.signing.store.file=… # etc
# → android/app/build/outputs/bundle/release/app-release.aab
```

Note that passing a password on the command line puts it in your shell history; on a
shared machine prefer an `env`-var file you delete afterwards, or sign the APK from
step 3 instead.

## 5. Before you publish — the app's current identity

The build is not store-ready as it stands. These are facts about this repo, not
opinions, and the first two will get a submission rejected outright.

| item | current value | source | consequence |
|---|---|---|---|
| `applicationId` | `com.moonshine` | `android/app/build.gradle` | This is the upstream Moonshine project's package name. You cannot publish under someone else's application ID. Change it (and `namespace`) to your own, e.g. `ca.canadaecoin.wallet`. Changing `applicationId` makes it a *different* app — it will not upgrade an installed `com.moonshine`. |
| `versionCode` | `1` | `android/app/build.gradle` | Hardcoded. Play rejects a second upload with the same `versionCode`. It must increase for every published build. |
| `versionName` | `1.0` | `android/app/build.gradle` | Hardcoded, while `package.json` says `0.7.2`. Two sources of truth; the APK shows `1.0`. |
| `minSdkVersion` | `24` | `android/build.gradle` | Android 7.0+. |
| `targetSdkVersion` | `35` | `android/build.gradle` | Current Play requirement as of writing. |
| new architecture | `newArchEnabled=true` | `android/gradle.properties` | Hermes + Fabric. Keep in mind when debugging native crashes. |

Wiring `versionCode`/`versionName` from `package.json` is a small, worthwhile follow-up;
it is deliberately not part of the CI change that produced this document.

## 6. Publishing channels

- **Google Play** — upload the `.aab`. On first upload Play offers *Play App Signing*,
  where Google holds the app signing key and yours becomes the upload key. That is a
  different trust model from "my key signs the shipped artifact"; read the terms before
  accepting, because it is difficult to leave.
- **Direct / GitHub Releases** — upload the signed APK. Users must enable installation
  from unknown sources. Publish the `sha256` next to it.
- **F-Droid** — builds from source itself and signs with its own key; it needs a
  reproducible build recipe, not this APK.

Whatever you choose, publish the artifact alongside the commit SHA and its checksum so
someone else can independently re-derive it.

## 7. Verifying somebody else's build

Anyone can check that a distributed APK corresponds to this source:

```bash
apksigner verify --print-certs -v cdn-moonshine-signed.apk   # who signed it
sha256sum cdn-moonshine-signed.apk                            # matches the published sum?
unzip -p cdn-moonshine-signed.apk assets/index.android.bundle | sha256sum
```

Reproducibility is close but not exact: the APK embeds build timestamps and the JS
bundle is minified by Metro, so an independent build of the same commit will not produce
a byte-identical APK. The commit SHA plus the signer's certificate is the reliable
identity, not a hash match.
