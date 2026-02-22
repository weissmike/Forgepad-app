<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f2feae73-e17b-4cd8-aa8a-01681b9b5562

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android APK CI Pipeline

A GitHub Actions workflow is included at `.github/workflows/build-apk.yml` to produce a debug APK on pushes, pull requests, or manual dispatch.

- Builds the Vite web app
- Bootstraps Capacitor Android project if missing
- Runs Gradle `assembleDebug`
- Uploads `app-debug.apk` as a workflow artifact (`forgepad-debug-apk`)


### What else is needed to ship a real Android app?

The CI pipeline now produces a debug APK by default and can produce a signed release APK when signing secrets are configured.

To fully ship ForgePad on Android, you should also:

- Capacitor dependencies are now included in `package.json` (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) for reproducible local Android builds.
- Commit the generated `android/` project once and keep it versioned.
- Configure these GitHub secrets for release signing:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Add a package name/versioning strategy and Play Store-ready signing/release process.
- Optionally add instrumentation tests and emulator smoke tests in CI.
