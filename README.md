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

## Tech

- React 18, Vite, React Router
- Open Food Facts API (no key) for nutrition
- Optional OpenAI API for insights
