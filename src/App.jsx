import React, { useState, useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useHealth } from './store/HealthContext'
import ProfileGate from './components/ProfileGate'
import WelcomeTutorial, { getTutorialSeen } from './components/WelcomeTutorial'
import Dashboard from './pages/Dashboard'
import Weight from './pages/Weight'
import Exercise from './pages/Exercise'
import Nutrition from './pages/Nutrition'
import Changelog from './pages/Changelog'
import Readme from './pages/Readme'
import Personal from './pages/Personal'
import './App.css'

// Use HashRouter when: (1) Capacitor, or (2) deployed with a base path (e.g. GitHub Pages)
// so that 404.html redirect to #/path works and in-app navigation doesn't need server config.
const hasBasePath = typeof import.meta.env.BASE_URL === 'string' && import.meta.env.BASE_URL !== './'
const useHashRouter = typeof window !== 'undefined' && (window.Capacitor || hasBasePath)
const Router = useHashRouter ? HashRouter : BrowserRouter

export default function App() {
  const { profileCode } = useHealth()
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (profileCode && !getTutorialSeen(profileCode)) {
      setShowTutorial(true)
    }
  }, [profileCode])

  if (!profileCode) {
    return <ProfileGate />
  }
  return (
    <Router>
      <div className="app">
        <nav className="nav">
          <div className="nav-center">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
              Dashboard
            </NavLink>
            <NavLink to="/weight" className={({ isActive }) => (isActive ? 'active' : '')}>
              Weight &amp; Body
            </NavLink>
            <NavLink to="/exercise" className={({ isActive }) => (isActive ? 'active' : '')}>
              Exercise
            </NavLink>
            <NavLink to="/nutrition" className={({ isActive }) => (isActive ? 'active' : '')}>
              Nutrition
            </NavLink>
            <NavLink to="/personal" className={({ isActive }) => (isActive ? 'active' : '')}>
              Personal
            </NavLink>
          </div>
        </nav>
        {showTutorial && (
          <WelcomeTutorial profileCode={profileCode} onDismiss={() => setShowTutorial(false)} />
        )}
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/weight" element={<Weight />} />
            <Route path="/exercise" element={<Exercise />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/readme" element={<Readme />} />
            <Route path="/personal" element={<Personal />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
