# Building the Android APK (full web app)

The **entire Body Health web app** runs inside an Android app (WebView) so you can install it as an APK and use it the same way as in the browser. This uses [Capacitor](https://capacitorjs.com/).

## Quick start

1. **Build the web app and sync to Android**
   ```bash
   npm run cap:sync
   ```
   This runs `npm run build` and copies the built files into `android-app/`.

2. **Open the Android project and run**
   - Open the **`android-app`** folder in **Android Studio** (File → Open → select `android-app`).
   - Wait for Gradle sync.
   - Connect a device or start an emulator (API 22+).
   - Run the app (Run → Run 'app' or the green play button).

   Or from the project root:
   ```bash
   npm run android
   ```
   This opens the `android-app` project in Android Studio.

3. **Build a release APK (for sharing/install)**
   - In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   - The APK is at: `android-app/app/build/outputs/apk/debug/app-debug.apk` (debug) or `.../release/` (after signing).

   From the command line (with Android SDK and `ANDROID_HOME` set):
   ```bash
   cd android-app
   ./gradlew assembleDebug
   ```
   APK: `android-app/app/build/outputs/apk/debug/app-debug.apk`.

## What runs in the APK

- The **same React app** as in the browser: Dashboard, Weight, Exercise, Nutrition, Personal, etc.
- Data is stored in the WebView’s local storage (same as in the browser), so it’s per-device.
- **Google Fit** “Connect & sync steps” works in the WebView (OAuth in an in-app browser).
- Routing uses **HashRouter** inside the app so navigation works when loaded from the device.

## Project layout

| Folder / file        | Purpose |
|----------------------|--------|
| **`android-app/`**  | Capacitor Android project: wraps the built web app in a WebView. This is what you open in Android Studio to build the APK. |
| **`android/`**      | Separate minimal app that only reads steps from Health Connect (see [android/README.md](android/README.md)). Not the full app. |
| **`capacitor.config.json`** | Capacitor config: app id, name, `webDir: dist`, Android path `android-app`. |
| **`dist/`**          | Output of `npm run build`; Capacitor copies this into `android-app` when you run `cap:sync`. |

## Workflow after code changes

1. Rebuild and sync:
   ```bash
   npm run cap:sync
   ```
2. In Android Studio, run the app again (or build a new APK).

You can also use **Live Reload** during development (see [Capacitor docs](https://capacitorjs.com/docs/guides/live-reload)).

## Requirements

- **Node**: to run `npm run build` and `npm run cap:sync`.
- **Android Studio** (or Android SDK + Gradle): to build and run the Android project.
- **Device or emulator**: API 22+ (Capacitor default).

## Signing a release APK

For installs outside of development, create a keystore and configure signing in Android Studio (Build → Generate Signed Bundle / APK), or add a `signingConfig` in `android-app/app/build.gradle`. See [Android docs](https://developer.android.com/studio/publish/app-signing).
