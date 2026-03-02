# Health Connect Steps (minimal Android app)

Minimal Android app that reads **today’s step count** from [Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect). Use it with Samsung Health / Samsung Watch: enable Health Connect and allow Samsung Health to write steps; this app reads the aggregated steps for today.

## Requirements

- **Android 8 (API 26)** or higher (Health Connect requires API 26+).
- **Health Connect** installed (often pre-installed on Android 14+; otherwise install from Play Store).
- Steps data in Health Connect (e.g. from Samsung Health, Google Fit, or your watch app).

## Build and run

1. Open the `android` folder in **Android Studio** (File → Open → select `android`).
2. Wait for Gradle sync.
3. Connect a device or start an emulator (API 26+).
4. Run the app (Run → Run 'app' or the green play button).

From the command line (with [Android SDK](https://developer.android.com/studio) and `ANDROID_HOME` set):

```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## What the app does

1. On launch (and when you tap **Refresh steps**), it asks for **Steps** permission in Health Connect if needed.
2. Once permission is granted, it reads **aggregated steps for today** (midnight to now, device time zone) and shows the count.
3. No data is sent off the device; everything stays in Health Connect and this app.

## Sending steps to the web app (body-health-app)

This app only reads and displays steps. To push steps into the [body-health-app](../) web app you would add:

1. A small backend (or serverless endpoint) that accepts steps + date + profile id.
2. In this Android app: after reading steps, POST that payload to your backend (over HTTPS, with the user’s profile code or token).
3. In the web app: load steps from that backend (or the same store) instead of/in addition to Google Fit.

See the project’s [HEALTH_CONNECT.md](../HEALTH_CONNECT.md) for the overall Fit → Health Connect migration and options.
