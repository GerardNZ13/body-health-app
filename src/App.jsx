import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useHealth } from './store/HealthContext'
import ProfileGate from './components/ProfileGate'
import Dashboard from './pages/Dashboard'
import Weight from './pages/Weight'
import Exercise from './pages/Exercise'
import Nutrition from './pages/Nutrition'
import Changelog from './pages/Changelog'
import Readme from './pages/Readme'
import Personal from './pages/Personal'
import './App.css'

export default function App() {
  const { profileCode } = useHealth()
  if (!profileCode) {
    return <ProfileGate />
  }
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
