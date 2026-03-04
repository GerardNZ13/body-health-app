import React from 'react'
import PageFooter from '../components/PageFooter'
import './Changelog.css'

const ENTRIES = [
  {
    version: '1.2.0',
    date: '2026-03',
    items: [
      "Exercise: How's the body? — Daily check-in with grouped body areas (Head & neck, Upper body, Core, Hips & thighs, Legs). Choose how each area feels: No issue, Muscle sore, Iffy/niggle, Painful, Weak. Data is stored per day.",
      "Exercise: Collapsible body-check-in sections with arrow toggle. Only Head & neck is open by default; after you pick a feeling in a section, it auto-collapses and the next section opens.",
      "Exercise: Flippable flow — How's the body? is shown first; tap Done — show workout suggestion to see today's workout. Workout suggestion is gated behind the body check-in step (back link to How's the body).",
      'Exercise: Steps / Activity / Workout / Movement rings only appear when you set at least one of those goals in Personal. New profiles start with goals at 0 so the rings stay hidden until you configure them.',
      "Exercise: Workout suggestions adapt to your body check-in. Get workout and Get AI suggestion both use today's check-in: they prefer exercises that are easier on areas you noted (e.g. knee sore → glute bridge, wall sit, reverse lunge prioritised; heavy squats deprioritised). A note confirms when suggestions are adapted.",
    ],
  },
  {
    version: '1.1.0',
    date: '2025-02',
    items: [
      'Nav: centered main links; Changelog + Readme on the right.',
      'Weight & Body: split into Insights (broad, local) vs AI-enabled insights (personalised).',
    ],
  },
  {
    version: '1.0.0',
    date: '2025',
    items: [
      'Weight & Body: Log 1 / Log 2, summary + trends (7/14/28/90-day), expandable tables, AI insights.',
      'Exercise: schedule, library (Bronze/Gold/Platinum), equipment checkboxes, quick-log from suggestion, tier inference.',
      'Steps: manual log; optional Google Fit sync (Connect & sync, auto-sync every 1 hr).',
      'Nutrition: Open Food Facts API, daily/weekly red–orange–green snapshots, targets.',
      'Dashboard: overview of weight, steps, next PPL, nutrition.',
      'Coach context: Holistic Body & Mind Coach persona, protocols, user context, List D.',
    ],
  },
]

export default function Changelog() {
  return (
    <div className="changelog-page">
      <h1 className="page-title">Changelog</h1>
      <p className="page-intro muted">Version history and notable updates.</p>
      {ENTRIES.map((entry) => (
        <section key={entry.version} className="card changelog-entry">
          <h3>
            <span className="version">{entry.version}</span>
            <span className="muted"> — {entry.date}</span>
          </h3>
          <ul>
            {entry.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <PageFooter />
    </div>
  )
}
