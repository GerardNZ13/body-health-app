# Body Health & Awareness

A **personal** health app that combines weight/measurements, exercise goals, and nutrition in one place—tuned for you.

## What it does

- **Weight & body** — Log weight and body measurements (chest, waist, hips, etc.). View trends and get **AI insights** (optional OpenAI API key) based on your history.
- **Exercise** — Set a daily steps goal (e.g. 6k) and track it. Log **Push / Pull / Legs** workouts and see the suggested next day. Uses your latest weight and measurements for context.
- **Nutrition** — Search or barcode-scan foods using **Open Food Facts** (real nutrition data). Set daily targets and get a **red / orange / green** snapshot for today and weekly average.

All data stays in your browser (localStorage). No account or server required.

## Run it

```bash
cd body-health-app
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## AI insights (optional)

On **Weight & body**, you can use **Google Gemini** or **OpenAI**. Insights are generated automatically after you add a new weight or measurement (when an API key is set). You can also click **Generate insights** anytime.

**Default Gemini key:** To avoid entering the key in the app each time, set it as a default:

1. Copy `.env.example` to `.env`.
2. Add your key: `VITE_GEMINI_API_KEY=your_key_here` (get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
3. Restart the dev server. The app will use this key and persist it in the browser.

## Customise

- **Targets** — Edit daily calories and macros in **Nutrition** (Daily targets). Edit steps goal in **Exercise**.
- **Measurements** — Use any of the preset body measurement names or add more in `Weight.jsx` (`MEASUREMENT_NAMES`).

## GitHub Pages

To publish as a GitHub-hosted page (e.g. `https://<user>.github.io/body-health-app/`):

1. **Use the GitHub Action** (recommended): In the repo go to **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` builds the app with the correct base path and deploys the `dist` folder. Push to `main` to deploy.

2. **If you already set “Deploy from a branch”**: GitHub Pages must serve the **built** site, not the repo root. The repo root has unbuilt source, so the browser would load `index.html` with `<script src="/src/main.jsx">`, which doesn’t exist on the server → blank page. Either switch the Pages source to **GitHub Actions** as above, or build locally with the correct base and deploy the contents of `dist` to your chosen branch (e.g. `gh-pages`):
   - **PowerShell:** `$env:BASE_PATH="/body-health-app/"; npm run build` then commit/upload the `dist` contents.
   - **Bash:** `BASE_PATH=/body-health-app/ npm run build`

3. **Repo name**: If your repo is not named `body-health-app`, set `BASE_PATH` to `/<your-repo-name>/` when building.

## Android APK

You can build the same app as an **Android APK** (runs in a WebView, same behaviour as the browser). See **[ANDROID_APK.md](ANDROID_APK.md)** for build and run steps. Requires Node, Android Studio, and `npm run cap:sync` then open `android-app` in Android Studio.

## Tech

- React 18, Vite, React Router
- Capacitor 6 for Android APK (optional)
- Open Food Facts API (no key) for nutrition
- Optional OpenAI API for insights
