import React from 'react'
import PageFooter from '../components/PageFooter'
import './Changelog.css'

const ENTRIES = [
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
