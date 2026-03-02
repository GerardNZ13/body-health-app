# Steps sync: Google Fit → Health Connect (Samsung Watch / Samsung Health)

## Where things stand

- **Google Fit APIs** are [being deprecated in 2026](https://developer.android.com/health-and-fitness/health-connect/migration/fit). This app currently uses the **Fitness REST API** (OAuth + `dataset:aggregate`) from the **browser** to fetch today’s steps.
- **Health Connect** is Android’s replacement: on-device, privacy-focused, and the place where Samsung Health (and others) can write steps. The [Fit migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit) says: for reading/writing fitness data, **add Health Connect to your app**.
- **Important**: Health Connect is an **Android (Jetpack) API**. There is no Health Connect REST API for web. So a **web-only** app cannot talk to Health Connect directly from the browser.

## Getting steps from Samsung Watch / Samsung Health

- **Samsung Health** can write steps (and other data) into **Health Connect** on Android. Many Samsung devices / Samsung Health already support this.
- To use that data in **this app** (a web app), you have two paths.

### Option A: Keep using Google Fit until 2026 (current setup)

- On the phone: sync **Samsung Health → Google Fit** (if your device/app supports it).
- In this app: **Personal → Steps from phone (Google Fit)** → Connect & sync steps.
- No code change; works as long as Google Fit and the sync path are available.

### Option B: Use Health Connect via an Android companion app (recommended long-term)

Because Health Connect is Android-only, the way to get Samsung Watch / Samsung Health steps into this web app is:

1. **Build a small Android app** that:
   - Uses [Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect) (Jetpack Health Connect library).
   - Requests permission for **Steps** (and optionally other types).
   - Reads **today’s step count** (e.g. aggregate steps for today).
   - Sends that value to **your backend** (or a secure endpoint this web app can call) with the user’s profile/session so the web app can store it in the same place it currently stores Google Fit steps.

2. **Web app changes**:
   - Add an endpoint or integration that accepts “steps for today” from the Android app (authenticated by profile code or token).
   - When the user opens the web app, it loads steps from your storage (same as now); the source of that data switches from “Google Fit API” to “Android app that read from Health Connect”.

3. **User flow**:
   - User installs the Android app, signs in / links profile (e.g. same profile code as the web app).
   - User grants Health Connect permission for Steps (Samsung Health may already be writing there).
   - Android app reads steps from Health Connect and pushes to your backend (or the web app’s data store).
   - Web app shows steps from that store; no Google Fit needed.

## Minimal Android app in this repo

The **`android/`** folder contains a minimal Android app that only reads today’s steps from Health Connect:

- **Permission**: requests `READ_STEPS` via Health Connect’s permission UI.
- **Read**: uses `HealthConnectClient.aggregate()` with `StepsRecord.COUNT_TOTAL` for today (midnight to now, device time zone).
- **UI**: one screen with status text, step count, and a “Refresh steps” button.

Build and run: open **`android`** in Android Studio, sync Gradle, then Run on a device or emulator (API 26+). See **[android/README.md](android/README.md)** for details.

To send steps to the web app later, add a backend and have this app POST steps (and profile id) after reading; the web app would then load steps from that backend instead of Google Fit.

## What to implement for Health Connect (Android) — reference

If you extend the app or build from scratch, follow the official guides:

1. **Add Health Connect to your app**  
   [Get started with Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started)

2. **Request permissions**  
   Use the Health Connect UI for permissions; request at least **Steps** (e.g. `StepsRecord` or the aggregate type your SDK uses).

3. **Read steps for today**  
   [Read aggregated data](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-aggregated-data) (or read raw step data and sum for “today” in the user’s time zone). Align “today” with how the web app defines it (e.g. profile timezone).

4. **Send to your backend**  
   From the Android app, POST today’s steps (and date) to your API, with the user’s profile identifier so the web app can associate the value with the right profile and store it in the same structure it uses for Google Fit steps (e.g. `exerciseLogs` for today with `steps`).

5. **Web app**  
   - Either keep “Connect & sync steps” but have it call your backend “steps for this profile” instead of Google Fit, or add a “Sync from Health Connect app” button that fetches from your backend.
   - Backend can be a simple server you host, or a serverless function (e.g. Firebase, Supabase, or similar) that the Android app writes to and the web app reads from.

## Summary

| Goal                         | Approach                                                                 |
|-----------------------------|--------------------------------------------------------------------------|
| Use Samsung Watch / Health  | Have Samsung Health write to **Health Connect** (device support).       |
| Use Health Connect from app| You need an **Android app**; Health Connect is not available from the web.|
| This web app gets those steps | Android app reads Health Connect → sends steps to your backend → web app uses that instead of Google Fit. |
| Until you have that Android app | Keep using **Google Fit** with “Samsung Health → Google Fit” sync (Option A). |

For the exact Fit → Health Connect migration steps and data types, see the official [Fit migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit).
