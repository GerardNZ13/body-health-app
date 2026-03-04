import React from 'react'
import { Link } from 'react-router-dom'
import './WelcomeTutorial.css'

const STORAGE_KEY_PREFIX = 'body-health-app-tutorial-seen-'

export function getTutorialSeen(profileCode) {
  if (!profileCode || typeof localStorage === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY_PREFIX + profileCode) === 'true'
}

export function setTutorialSeen(profileCode) {
  if (!profileCode || typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PREFIX + profileCode, 'true')
}

export default function WelcomeTutorial({ profileCode, onDismiss }) {
  const handleGotIt = () => {
    setTutorialSeen(profileCode)
    onDismiss?.()
  }

  return (
    <div className="welcome-tutorial-overlay" role="dialog" aria-labelledby="welcome-tutorial-title" aria-modal="true">
      <div className="welcome-tutorial-backdrop" aria-hidden />
      <div className="welcome-tutorial-card card">
        <h2 id="welcome-tutorial-title" className="welcome-tutorial-title">Welcome to Body Health</h2>
        <p className="welcome-tutorial-intro">Here’s a quick start so you can get the most out of the app.</p>
        <ol className="welcome-tutorial-steps">
          <li>
            <strong>Personal</strong> — Set your goals (steps, activity, workout time, movement). Exercise rings on the Exercise page only appear once you’ve set at least one goal here.
          </li>
          <li>
            <strong>Exercise → How’s the body?</strong> — Tap through the body areas and say how each feels (No issue, Sore, Iffy, Painful, Weak). Then tap <em>Done — show workout suggestion</em>.
          </li>
          <li>
            <strong>Today’s workout suggestion</strong> — Pick a session type (Push, Pull, Legs, etc.) and tap <em>Get workout</em> or <em>Get AI suggestion</em>. Suggestions adapt to what you noted in the body check-in.
          </li>
          <li>
            <strong>Weight &amp; Body</strong> — Log weight and measurements when you can. Trends and optional AI insights use this data.
          </li>
        </ol>
        <p className="welcome-tutorial-footer">All data stays in your browser. You can revisit the <Link to="/readme">Readme</Link> or <Link to="/changelog">Changelog</Link> anytime.</p>
        <button type="button" className="btn welcome-tutorial-btn" onClick={handleGotIt}>
          Got it
        </button>
      </div>
    </div>
  )
}
