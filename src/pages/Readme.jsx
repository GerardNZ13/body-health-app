import React from 'react'
import PageFooter from '../components/PageFooter'
import './Readme.css'

export default function Readme() {
  return (
    <div className="readme-page">
      <h1 className="page-title">Readme — setup &amp; logic</h1>
      <p className="page-intro muted">How the app is set up and how each part works.</p>

      <section className="card readme-section">
        <h2>Tech stack</h2>
        <p>React 18, Vite 5, React Router. No backend; data lives in browser localStorage.</p>
      </section>

      <section className="card readme-section">
        <h2>Environment (.env)</h2>
        <ul>
          <li><strong>VITE_GEMINI_API_KEY</strong> — Optional. Default API key for AI insights (Weight & Body, Exercise). You can also save a key in the app (Weight page).</li>
          <li><strong>VITE_GOOGLE_CLIENT_ID</strong> — Optional. Google OAuth 2.0 Web client ID for steps sync from Google Fit. Create in Google Cloud, enable Fitness API.</li>
        </ul>
        <p className="muted small">Copy <code>.env.example</code> to <code>.env</code> and fill in. Do not commit <code>.env</code>.</p>
      </section>

      <section className="card readme-section">
        <h2>Personal details</h2>
        <p>Age, height (cm), starting weight, goal weight, goal exercise level (Bronze/Gold/Platinum). Used for BMI and rate-of-loss on the Personal page, for local and AI insights on Weight, for workout notes on Exercise, and for the goal line on the Dashboard. Set via the Personal page.</p>
      </section>

      <section className="card readme-section">
        <h2>Data store (HealthContext)</h2>
        <p>Single React context + reducer. Persisted to localStorage under <code>body-health-app-data</code>.</p>
        <ul>
          <li><strong>personalDetails</strong> — age, heightCm, startingWeightKg, goalWeightKg, goalExerciseLevel.</li>
          <li><strong>log1WeightCampaign</strong> — Weight & Mass Campaign (date, phase, value, note). Exposed as <code>weight</code>.</li>
          <li><strong>log2MeasurementDelta</strong> — Body measurements by area and date (cm). Exposed as <code>measurements</code>.</li>
          <li><strong>exerciseGoals</strong> — stepsDaily, pplRotation, equipment[], autoSyncSteps, stepsLastSyncedAt.</li>
          <li><strong>exerciseLogs</strong> — Date, steps, workoutType, tier, optional exercisesDone[].</li>
          <li><strong>customExerciseLibrary</strong> — AI-generated exercise library (Push/Pull/Legs/Mobility/Cardio × Bronze/Gold/Platinum). Null = use baseline from <code>src/data/exercises.js</code>.</li>
          <li><strong>nutritionLogs</strong>, <strong>nutritionTargets</strong> — Daily entries and calorie/macro targets.</li>
          <li><strong>aiApiKey</strong>, <strong>aiProvider</strong>, <strong>aiInsights</strong>, <strong>exerciseSuggestion</strong>, <strong>lastWorkoutResult</strong>.</li>
        </ul>
      </section>

      <section className="card readme-section">
        <h2>Weight &amp; Body</h2>
        <ul>
          <li><strong>Insights</strong> — Local only. Uses age, height, current weight, BMI, trends (7/14/28/90-day from your last log date), and measurements to produce a short “broad” summary (e.g. progress and encouragement). No API.</li>
          <li><strong>AI-enabled insights</strong> — Sends weight + measurement history to Gemini (or OpenAI). Uses the coach system prompt in <code>src/config/coachContext.js</code> for personalised, tiered (Bronze/Gold/Platinum) advice. Runs after new weight/measurement or when you click Generate.</li>
          <li>Trends are computed from logs whose dates fall in each window ending on your <em>most recent log date</em> (not calendar today).</li>
        </ul>
      </section>

      <section className="card readme-section">
        <h2>Exercise</h2>
        <ul>
          <li><strong>Schedule</strong> — Push, Pull, Legs, Mobility, Cardio. Next suggested = rotate after last logged type.</li>
          <li><strong>Equipment</strong> — Checkboxes filter which exercises appear in “Get workout”. Matching is by tags (kettlebell, band, bar, etc.).</li>
          <li><strong>Get workout</strong> — From <code>workoutFromLibrary.js</code>: uses current weight, recent tier history (including tier inferred from exercisesDone), and equipment. Returns Bronze/Gold/Platinum exercise lists.</li>
          <li><strong>Quick log</strong> — After “Get workout”, you can tick exercises and sets per tier. Effective tier (highest ticked) is stored so “push = gold, legs = platinum” etc. inform future suggestions.</li>
          <li><strong>Update workout suggestions</strong> — AI generates a full custom library (respecting your equipment) and saves it as <code>customExerciseLibrary</code>.</li>
          <li><strong>Steps</strong> — Manual entry or Google Fit (Connect & sync; optional auto-sync every 1 hr while app is open). Samsung Health has no web API; sync Samsung Health → Google Fit to use it.</li>
        </ul>
      </section>

      <section className="card readme-section">
        <h2>Coach context (coachContext.js)</h2>
        <p>Defines the “Holistic Body &amp; Mind Coach” persona, Leg Health Integrity Protocol, Sleeper Build &amp; safety disclaimer, user context (age, height, goals, equipment, List D), and the rule to always respond in Bronze / Gold / Platinum tiers. Used by AI for Weight insights and Exercise suggestions.</p>
      </section>

      <section className="card readme-section">
        <h2>Nutrition</h2>
        <p>Open Food Facts API for search/barcode. Daily and weekly snapshots: red / orange / green vs targets. Data stored in <code>nutritionLogs</code> by date.</p>
      </section>

      <section className="card readme-section">
        <h2>Running the app</h2>
        <p><code>npm run dev</code> — Vite dev server (e.g. <code>http://localhost:5173</code>). <code>npm run build</code> for production build; <code>npm run preview</code> to preview the build.</p>
      </section>
      <PageFooter />
    </div>
  )
}
