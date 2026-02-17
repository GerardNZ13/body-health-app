import React from 'react'
import { Link } from 'react-router-dom'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { nutritionSnapshot } from '../utils/nutritionSnapshot'
import PageFooter from '../components/PageFooter'
import './Dashboard.css'

export default function Dashboard() {
  const {
    weight,
    personalDetails,
    exerciseGoals,
    exerciseLogs,
    nutritionLogs,
    nutritionTargets,
  } = useHealth()

  const dateUtils = useDateUtils()
  const todayKey = dateUtils.getTodayKey()
  const todaySteps = exerciseLogs.find((l) => l.date === todayKey)?.steps ?? 0
  const stepsGoal = exerciseGoals.stepsDaily ?? 6000
  const stepsPct = stepsGoal ? Math.min(100, (todaySteps / stepsGoal) * 100) : 0

  const latestWeight = weight.length ? weight[weight.length - 1] : null
  const weekKeys = dateUtils.getWeekKeys()
  const weekNutrition = weekKeys.map((date) => {
    const dayLog = nutritionLogs.find((l) => l.date === date)
    const totals = dayLog
      ? dayLog.entries.reduce(
          (acc, e) => ({
            calories: acc.calories + (e.calories || 0),
            protein: acc.protein + (e.protein || 0),
            carbs: acc.carbs + (e.carbs || 0),
            fat: acc.fat + (e.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
      : { calories: 0, protein: 0, carbs: 0, fat: 0 }
    return { date, ...totals }
  })
  const dailySnapshot = nutritionSnapshot(
    nutritionLogs.find((l) => l.date === todayKey)?.entries || [],
    nutritionTargets
  )
  const weeklyAvgCalories = weekNutrition.reduce((acc, d) => acc + (d.calories || 0), 0) / 7
  const weeklySnapshot = nutritionSnapshot(weeklyAvgCalories, nutritionTargets, true)

  const nextPpl = (() => {
    const ppl = exerciseGoals.pplRotation || []
    const last = ppl[ppl.length - 1]
    if (!last) return 'Push'
    const order = ['Push', 'Pull', 'Legs', 'Mobility', 'Cardio']
    const idx = order.indexOf(last.type)
    return order[(idx + 1) % 3]
  })()

  return (
    <div className="dashboard">
      <h1 className="page-title">Your health at a glance</h1>

      <div className="dashboard-grid">
        <section className="card dashboard-card">
          <h3>Weight &amp; body</h3>
          {latestWeight ? (
            <p className="big-value">
              <strong>{latestWeight.value}</strong> <span className="unit">kg</span>
              <span className="muted"> — {dateUtils.formatShortDate(latestWeight.date)}</span>
            </p>
          ) : (
            <p className="muted">No weight logged yet.</p>
          )}
          {personalDetails?.goalWeightKg != null && (
            <p className="muted small">
              Goal: <strong>{personalDetails.goalWeightKg} kg</strong>
              {latestWeight && latestWeight.value > personalDetails.goalWeightKg && (
                <> · {((latestWeight.value - personalDetails.goalWeightKg)).toFixed(1)} kg to go</>
              )}
            </p>
          )}
          <Link to="/weight" className="btn btn-ghost btn-sm">
            Log &amp; see trends
          </Link>
          <Link to="/personal" className="btn btn-ghost btn-sm" style={{ marginLeft: '0.5rem' }}>
            Personal
          </Link>
        </section>

        <section className="card dashboard-card">
          <h3>Today&apos;s steps</h3>
          <p className="big-value">
            <strong>{todaySteps.toLocaleString()}</strong>
            <span className="muted"> / {stepsGoal.toLocaleString()} goal</span>
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stepsPct}%` }} />
          </div>
          <Link to="/exercise" className="btn btn-ghost btn-sm">
            Exercise goals
          </Link>
        </section>

        <section className="card dashboard-card">
          <h3>Next workout (PPL)</h3>
          <p className="big-value">
            <strong className="pill pill-next">{nextPpl}</strong>
          </p>
          <Link to="/exercise" className="btn btn-ghost btn-sm">
            Log workout
          </Link>
        </section>

        <section className="card dashboard-card snapshot-card">
          <h3>Nutrition snapshot</h3>
          <div className="snapshot-row">
            <span>Today:</span>
            <span className={`snapshot-badge snapshot-${dailySnapshot}`}>{dailySnapshot}</span>
          </div>
          <div className="snapshot-row">
            <span>Weekly avg:</span>
            <span className={`snapshot-badge snapshot-${weeklySnapshot}`}>{weeklySnapshot}</span>
          </div>
          <Link to="/nutrition" className="btn btn-ghost btn-sm">
            Log food &amp; targets
          </Link>
        </section>
      </div>
      <PageFooter />
    </div>
  )
}
