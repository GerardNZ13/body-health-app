import React from 'react'
import { Link } from 'react-router-dom'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { nutritionSnapshot } from '../utils/nutritionSnapshot'
import { getRecommendedNutrition, getActualExerciseLevel, getDietPattern, DIET_PATTERN_LABELS } from '../utils/recommendedNutrition'
import { averageRateKgPerWeek } from '../utils/personalStats'
import { getHolisticInsight } from '../utils/holisticInsight'
import { getGentleNudges } from '../utils/gentleNudges'
import { getHydrationInsight } from '../utils/hydrationInsight'
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
  const weekKeys = dateUtils.getWeekKeys(7)
  const recentDayKeys = dateUtils.getWeekKeys(14)
  const todaySteps = exerciseLogs.find((l) => l.date === todayKey)?.steps ?? 0
  const stepsGoal = exerciseGoals.stepsDaily ?? 6000
  const stepsPct = stepsGoal ? Math.min(100, (todaySteps / stepsGoal) * 100) : 0

  const sortedWeight = Array.isArray(weight) ? [...weight].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
  const currentWeight = sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1].value : null
  const latestWeight = sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1] : null
  const recommended = getRecommendedNutrition(personalDetails ?? {}, currentWeight, {
    nutritionLogs: nutritionLogs ?? [],
    dayKeys: recentDayKeys,
  })
  const targets = recommended ?? nutritionTargets

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
    targets
  )
  const weeklyAvgCalories = weekNutrition.reduce((acc, d) => acc + (d.calories || 0), 0) / 7
  const weeklySnapshot = nutritionSnapshot(weeklyAvgCalories, targets, true)

  const weightRate = averageRateKgPerWeek(sortedWeight)
  const actualExerciseLevel = getActualExerciseLevel(exerciseLogs ?? [], 15)
  const goalExerciseLevel = personalDetails?.goalExerciseLevel ?? 'Gold'
  const dietPattern = getDietPattern(nutritionLogs ?? [], recentDayKeys)
  const goalKg = personalDetails?.goalWeightKg
  const kgToGo = currentWeight != null && goalKg != null ? goalKg - currentWeight : null

  const nextPpl = (() => {
    const ppl = exerciseGoals.pplRotation || []
    const last = ppl[ppl.length - 1]
    if (!last) return 'Push'
    const order = ['Push', 'Pull', 'Legs', 'Mobility', 'Cardio']
    const idx = order.indexOf(last.type)
    return order[(idx + 1) % order.length]
  })()
  const workoutLogsOnly = exerciseLogs.filter((l) => l.workoutType && l.workoutType !== 'Rest')
  const lastWorkoutEntry = workoutLogsOnly.slice(-1)[0]
  const lastWorkoutType = lastWorkoutEntry?.workoutType ?? null
  const workoutLoggedToday = !!exerciseLogs.find((l) => l.date === todayKey && l.workoutType && l.workoutType !== 'Rest')

  const todayEntries = nutritionLogs?.find((l) => l.date === todayKey)?.entries ?? []
  const gentleNudges = getGentleNudges(todayEntries)
  const hasAnyNutritionData = todayEntries.length > 0 || weekNutrition.some((d) => (d.calories || 0) > 0)
  const hydrationInsight = getHydrationInsight(nutritionLogs ?? [], weekKeys, todayKey)
  const holistic = getHolisticInsight({
    currentWeight: currentWeight ?? null,
    weightRateKgPerWeek: weightRate ?? null,
    goalWeightKg: goalKg ?? null,
    dailySnapshot,
    weeklySnapshot,
    actualExerciseLevel: actualExerciseLevel ?? null,
    goalExerciseLevel: goalExerciseLevel ?? null,
    todaySteps,
    stepsGoal,
    gentleNudges,
    hasAnyNutritionData,
    hydrationInsight,
  })

  return (
    <div className="dashboard">
      <h1 className="page-title">Your health at a glance</h1>

      {(currentWeight != null || (nutritionLogs?.length > 0) || (exerciseLogs?.filter((l) => l.workoutType).length > 0)) && (
        <section className="card holistic-summary">
          <h3>Where you&apos;re at</h3>
          <p className="holistic-intro muted small">Weight, nutrition and exercise all inform each other. Here&apos;s how yours line up.</p>
          <dl className="holistic-grid">
            {currentWeight != null && (
              <>
                <dt>Weight</dt>
                <dd>
                  <strong>{currentWeight} kg</strong>
                  {weightRate != null && (
                    <span className="muted"> · {weightRate < 0 ? `${weightRate.toFixed(2)} kg/week` : weightRate > 0 ? `+${weightRate.toFixed(2)} kg/week` : 'stable'}</span>
                  )}
                  {kgToGo != null && kgToGo > 0 && goalKg != null && (
                    <span className="muted"> · {kgToGo.toFixed(1)} kg to goal ({goalKg} kg)</span>
                  )}
                </dd>
              </>
            )}
            <dt>Nutrition</dt>
            <dd>
              Today <span className={`snapshot-badge snapshot-${dailySnapshot}`}>{dailySnapshot}</span>
              {' · '}Weekly avg <span className={`snapshot-badge snapshot-${weeklySnapshot}`}>{weeklySnapshot}</span>
              {recommended && <span className="muted"> · Target ~{recommended.calories} kcal, P {recommended.protein}g</span>}
            </dd>
            <dt>Exercise</dt>
            <dd>
              {actualExerciseLevel ? (
                <>Lately at <strong>{actualExerciseLevel}</strong>{goalExerciseLevel !== actualExerciseLevel && <> (goal: {goalExerciseLevel})</>}</>
              ) : (
                <span className="muted">Log workouts to see your level</span>
              )}
            </dd>
            {dietPattern && dietPattern.type !== 'balanced' && (
              <>
                <dt>Eating pattern</dt>
                <dd className="muted">{DIET_PATTERN_LABELS[dietPattern.type] ?? dietPattern.type} — macros suggested to match</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {holistic.hasData && holistic.items.length > 0 && (
        <section className="card other-insights" role="region" aria-label="Insights from your data">
          <h3>Other insights</h3>
          <p className="other-insights-intro muted small">
            Each note is about one area (weight, nutrition, movement) and says what period it refers to — so you know what &quot;it&quot; is and whether it&apos;s a sliding trend, today, or this week. No judgment, just what the numbers suggest.
          </p>
          <ul className="other-insights-list">
            {holistic.items.map((item) => (
              <li key={item.id} className="other-insight-item">
                <span className="other-insight-meta">
                  <strong>{item.label}</strong>
                  <span className="other-insight-timeframe muted"> · {item.timeframe}</span>
                </span>
                <p className="other-insight-message">{item.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

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

        <section className="card dashboard-card movement-card">
          <h3>Steps &amp; workout</h3>
          <p className="big-value">
            <strong>{todaySteps.toLocaleString()}</strong>
            <span className="muted"> / {stepsGoal.toLocaleString()} steps</span>
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stepsPct}%` }} />
          </div>
          <div className="movement-next">
            <span className="muted small">Next up: </span>
            <strong className="pill pill-next">{nextPpl}</strong>
            {lastWorkoutType && (
              <span className="muted small"> · Last: {lastWorkoutType}</span>
            )}
          </div>
          {workoutLoggedToday && (
            <p className="movement-done muted small">
              Workout logged today
            </p>
          )}
          <Link to="/exercise" className="btn btn-ghost btn-sm">
            Log steps &amp; workout
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
