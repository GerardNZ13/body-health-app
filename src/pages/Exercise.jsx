import React, { useState, useCallback } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { getWorkoutFromLibrary, formatWorkoutForDisplay, deriveEffectiveTier } from '../utils/workoutFromLibrary'
import { getWorkLevel, getWorkLevelScale, getSuggestFullRestDay } from '../utils/workLevel'
import { fetchExerciseSuggestion } from '../services/ai'
import PageFooter from '../components/PageFooter'
import BodyCheckIn from '../components/BodyCheckIn'
import './Exercise.css'

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Mobility', 'Cardio']
const TIERS = ['Bronze', 'Gold', 'Platinum']

export default function Exercise() {
  const {
    weight,
    personalDetails,
    exerciseGoals,
    exerciseLogs,
    exerciseSuggestion,
    customExerciseLibrary,
    lastWorkoutResult,
    bodyCheckIns,
    setGoals,
    logExercise,
    updateExerciseLog,
    setExerciseSuggestion,
    setLastWorkoutResult,
    setBodyCheckIn,
    aiApiKey,
    aiProvider,
  } = useHealth()
  const dateUtils = useDateUtils()
  const userEquipment = exerciseGoals.equipment || []
  const autoSyncSteps = !!exerciseGoals.autoSyncSteps
  const stepsLastSyncedAt = exerciseGoals.stepsLastSyncedAt || null

  const todayKey = dateUtils.getTodayKey()
  const todayLog = exerciseLogs.find((l) => l.date === todayKey)
  const latestWeight = weight.length ? weight[weight.length - 1].value : null
  const stepsGoal = exerciseGoals.stepsDaily ?? 0
  const activityKcalGoal = exerciseGoals.activityKcalDaily ?? 0
  const workoutMinsGoal = exerciseGoals.workoutMinsDaily ?? 0
  const movementHoursGoal = exerciseGoals.movementHoursDaily ?? 0
  const hasAnyRingGoal = stepsGoal > 0 || activityKcalGoal > 0 || workoutMinsGoal > 0 || movementHoursGoal > 0
  const stepsGoalForWorkLevel = stepsGoal > 0 ? stepsGoal : 6000

  const [stepsInput, setStepsInput] = useState(todayLog?.steps?.toString() ?? '')
  const [activityKcalInput, setActivityKcalInput] = useState(todayLog?.activityKcal?.toString() ?? '')
  const [workoutMinsInput, setWorkoutMinsInput] = useState(todayLog?.workoutMins?.toString() ?? '')
  const [movementHoursInput, setMovementHoursInput] = useState(todayLog?.movementHours?.toString() ?? '')
  const [workoutType, setWorkoutType] = useState('Push')
  const [workoutTier, setWorkoutTier] = useState('Gold')
  const [workoutNote, setWorkoutNote] = useState('')
  const [workoutDurationMins, setWorkoutDurationMins] = useState('')
  const [suggestionType, setSuggestionType] = useState('Push')
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [quickLogChecked, setQuickLogChecked] = useState({})
  const [quickLogSets, setQuickLogSets] = useState({})
  const [quickLogDurationMins, setQuickLogDurationMins] = useState('')
  const [logWorkoutOpen, setLogWorkoutOpen] = useState(false)
  const [workoutHistoryOpen, setWorkoutHistoryOpen] = useState(false)

  const workoutLogsOnly = exerciseLogs.filter((l) => l.workoutType && l.workoutType !== 'Rest')
  const lastLogged = workoutLogsOnly.slice(-1)[0]
  const nextSuggested = lastLogged
    ? WORKOUT_TYPES[(WORKOUT_TYPES.indexOf(lastLogged.workoutType) + 1) % WORKOUT_TYPES.length]
    : 'Push'

  const recentTierLogs = workoutLogsOnly.slice(-10)

  const workoutDoneToday = !!(todayLog?.workoutType && todayLog.workoutType !== 'Rest')
  const workLevel = getWorkLevel(todayLog?.steps ?? 0, stepsGoalForWorkLevel, workoutDoneToday, {
    recentLogs: exerciseLogs,
    todayKey,
    ringGoals: { activityKcalDaily: activityKcalGoal, workoutMinsDaily: workoutMinsGoal, movementHoursDaily: movementHoursGoal },
    todayRings: {
      activityKcal: todayLog?.activityKcal,
      workoutMins: todayLog?.workoutMins,
      movementHours: todayLog?.movementHours,
    },
  })
  const workLevelScale = getWorkLevelScale(workLevel.level, workLevel.recommendation, workLevel.trend)
  const fullRestSuggestion = getSuggestFullRestDay(exerciseLogs, todayKey, stepsGoalForWorkLevel, {
    activityKcalDaily: activityKcalGoal,
    workoutMinsDaily: workoutMinsGoal,
    movementHoursDaily: movementHoursGoal,
  })

  const getWorkoutFromLibraryClick = useCallback(() => {
    setSuggestionError('')
    const workout = getWorkoutFromLibrary(
      suggestionType,
      latestWeight,
      recentTierLogs,
      customExerciseLibrary,
      userEquipment,
      personalDetails?.goalExerciseLevel || null,
      todayKey,
      workLevelScale
    )
    let text = formatWorkoutForDisplay(workout)
    if (workoutMinsGoal > 0) text += `\n\nTarget: complete within your daily workout time goal (${workoutMinsGoal} min).`
    setExerciseSuggestion(text)
    setLastWorkoutResult({ ...workout, sessionType: suggestionType })
    setQuickLogChecked({})
    setQuickLogSets({})
  }, [suggestionType, latestWeight, recentTierLogs, customExerciseLibrary, userEquipment, personalDetails?.goalExerciseLevel, todayKey, workLevelScale, workoutMinsGoal, setExerciseSuggestion, setLastWorkoutResult])

  const getWorkoutFromAi = useCallback(async () => {
    const key = aiApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('body-health-app-data-apikey') : null)
    if (!key) {
      setSuggestionError('Add and save an API key on Weight & Body first.')
      return
    }
    setSuggestionError('')
    setSuggestionLoading(true)
    try {
      const text = await fetchExerciseSuggestion(aiProvider, key, {
        workoutType: suggestionType,
        weight,
        exerciseLogs,
        stepsToday: todayLog?.steps ?? null,
        workLevel,
      })
      setExerciseSuggestion(text)
    } catch (err) {
      setSuggestionError(err.message || 'Failed to get suggestion.')
    } finally {
      setSuggestionLoading(false)
    }
  }, [aiApiKey, aiProvider, suggestionType, weight, exerciseLogs, todayLog?.steps, workLevel, setExerciseSuggestion])

  const handleLogSteps = (e) => {
    e.preventDefault()
    const val = parseInt(stepsInput, 10)
    if (!Number.isInteger(val) || val < 0) return
    if (todayLog) updateExerciseLog(todayKey, { steps: val })
    else logExercise({ date: todayKey, steps: val })
    setStepsInput('')
  }

  const handleLogRing = (e, field, value, setInput) => {
    e.preventDefault()
    if (value === '' || (field === 'movementHours' ? parseFloat(value) < 0 : parseInt(value, 10) < 0)) return
    const num = field === 'movementHours' ? parseFloat(value) : parseInt(value, 10)
    if (Number.isNaN(num)) return
    const payload = { date: todayKey, [field]: num }
    if (todayLog) updateExerciseLog(todayKey, { [field]: num })
    else logExercise(payload)
    setInput('')
  }

  const handleLogWorkout = (e) => {
    e.preventDefault()
    const newRotation = [...(exerciseGoals.pplRotation || []), { date: todayKey, type: workoutType }]
    setGoals({ pplRotation: newRotation })
    const mins = workoutDurationMins.trim() ? parseInt(workoutDurationMins, 10) : undefined
    const payload = {
      date: todayKey,
      workoutType,
      tier: workoutTier,
      workoutNote: workoutNote || undefined,
      ...(mins != null && !Number.isNaN(mins) && mins >= 0 ? { workoutMins: mins } : {}),
    }
    if (todayLog) updateExerciseLog(todayKey, payload)
    else logExercise(payload)
    setWorkoutNote('')
    setWorkoutDurationMins('')
  }

  const handleQuickLog = (e) => {
    e.preventDefault()
    if (!lastWorkoutResult?.sessionType) return
    const exercisesDone = []
    TIERS.forEach((tier) => {
      const list = lastWorkoutResult[tier.toLowerCase()] || []
      list.forEach((ex) => {
        const key = `${tier}-${ex.name}`
        if (quickLogChecked[key]) {
          const sets = Math.max(0, parseInt(quickLogSets[key], 10) || 0)
          exercisesDone.push({ tier, exerciseName: ex.name, sets: sets || undefined })
        }
      })
    })
    const effectiveTier = deriveEffectiveTier(exercisesDone) || workoutTier
    const newRotation = [...(exerciseGoals.pplRotation || []), { date: todayKey, type: lastWorkoutResult.sessionType }]
    setGoals({ pplRotation: newRotation })
    const mins = quickLogDurationMins.trim() ? parseInt(quickLogDurationMins, 10) : undefined
    const payload = {
      date: todayKey,
      workoutType: lastWorkoutResult.sessionType,
      tier: effectiveTier,
      exercisesDone: exercisesDone.length ? exercisesDone : undefined,
      workoutNote: exercisesDone.length ? `Quick log: ${exercisesDone.map((d) => `${d.tier} ${d.exerciseName}${d.sets ? ` ${d.sets} sets` : ''}`).join('; ')}` : undefined,
      ...(mins != null && !Number.isNaN(mins) && mins >= 0 ? { workoutMins: mins } : {}),
    }
    if (todayLog) updateExerciseLog(todayKey, payload)
    else logExercise(payload)
    setQuickLogChecked({})
    setQuickLogSets({})
    setQuickLogDurationMins('')
  }

  const toggleQuickLog = (key) => {
    setQuickLogChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const setQuickLogSet = (key, val) => {
    setQuickLogSets((prev) => ({ ...prev, [key]: val }))
  }

  const handleLogRestDay = () => {
    if (todayLog) {
      updateExerciseLog(todayKey, { workoutType: 'Rest' })
    } else {
      logExercise({ date: todayKey, workoutType: 'Rest' })
    }
  }

  return (
    <div className="exercise-page">
      <h1 className="page-title">Exercise</h1>
      <p className="page-intro muted">
        Today&apos;s suggested workout (Bronze / Gold / Platinum) and logging. Steps + activity rings met daily = baseline success; PPL fits into your workout time goal.
      </p>

      {/* Steps + rings only when goals set in Personal; then How's the body, then flip */}
      <section className="card suggestion-card">
        {hasAnyRingGoal && (
          <>
            <p className="muted small steps-rings-hint">Steps + rings: set goals on Personal. Log below.</p>
            <div className="steps-and-rings">
              {stepsGoal > 0 && (
                <div className="steps-ring-box suggestion-steps-box">
                  <span className="suggestion-steps-label">Steps</span>
                  <span className="suggestion-steps-value">
                    {(todayLog?.steps ?? 0).toLocaleString()} / {stepsGoal.toLocaleString()}
                  </span>
                  <div className="suggestion-steps-bar">
                    <div className="suggestion-steps-fill" style={{ width: `${Math.min(100, ((todayLog?.steps ?? 0) / stepsGoal) * 100)}%` }} />
                  </div>
                  <form onSubmit={handleLogSteps} className="suggestion-steps-form">
                    <input type="number" min="0" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} placeholder="Log" aria-label="Steps today" />
                    <button type="submit" className="btn btn-sm" disabled={stepsInput === ''}>{todayLog ? 'Update' : 'Log'}</button>
                  </form>
                </div>
              )}
              {activityKcalGoal > 0 && (
                <div className="steps-ring-box">
                  <span className="ring-label">Activity</span>
                  <span className="ring-value">{(todayLog?.activityKcal ?? 0)} / {activityKcalGoal} kcal</span>
                  <div className="ring-bar">
                    <div className="ring-fill ring-fill-activity" style={{ width: `${Math.min(100, ((todayLog?.activityKcal ?? 0) / activityKcalGoal) * 100)}%` }} />
                  </div>
                  <form onSubmit={(e) => handleLogRing(e, 'activityKcal', activityKcalInput, setActivityKcalInput)} className="ring-form">
                    <input type="number" min="0" value={activityKcalInput} onChange={(e) => setActivityKcalInput(e.target.value)} placeholder="Log" aria-label="Activity kcal" />
                    <button type="submit" className="btn btn-sm" disabled={activityKcalInput === ''}>Log</button>
                  </form>
                </div>
              )}
              {workoutMinsGoal > 0 && (
                <div className="steps-ring-box">
                  <span className="ring-label">Workout</span>
                  <span className="ring-value">{(todayLog?.workoutMins ?? 0)} / {workoutMinsGoal} min</span>
                  <div className="ring-bar">
                    <div className="ring-fill ring-fill-workout" style={{ width: `${Math.min(100, ((todayLog?.workoutMins ?? 0) / workoutMinsGoal) * 100)}%` }} />
                  </div>
                  <form onSubmit={(e) => handleLogRing(e, 'workoutMins', workoutMinsInput, setWorkoutMinsInput)} className="ring-form">
                    <input type="number" min="0" value={workoutMinsInput} onChange={(e) => setWorkoutMinsInput(e.target.value)} placeholder="Log" aria-label="Workout minutes" />
                    <button type="submit" className="btn btn-sm" disabled={workoutMinsInput === ''}>Log</button>
                  </form>
                </div>
              )}
              {movementHoursGoal > 0 && (
                <div className="steps-ring-box">
                  <span className="ring-label">Movement</span>
                  <span className="ring-value">{(todayLog?.movementHours ?? 0)} / {movementHoursGoal} hrs</span>
                  <div className="ring-bar">
                    <div className="ring-fill ring-fill-movement" style={{ width: `${Math.min(100, ((todayLog?.movementHours ?? 0) / movementHoursGoal) * 100)}%` }} />
                  </div>
                  <form onSubmit={(e) => handleLogRing(e, 'movementHours', movementHoursInput, setMovementHoursInput)} className="ring-form">
                    <input type="number" min="0" step="0.5" value={movementHoursInput} onChange={(e) => setMovementHoursInput(e.target.value)} placeholder="Log" aria-label="Movement hours" />
                    <button type="submit" className="btn btn-sm" disabled={movementHoursInput === ''}>Log</button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        <h3 className={`body-check-in-heading ${!hasAnyRingGoal ? 'body-check-in-first' : ''}`}>How&apos;s the body?</h3>
        <BodyCheckIn
          dateKey={todayKey}
          regions={bodyCheckIns?.find((c) => c.date === todayKey)?.regions ?? {}}
          setBodyCheckIn={setBodyCheckIn}
          noRingsAbove={!hasAnyRingGoal}
        />

        <div className="suggestion-card-flip">
          {!logWorkoutOpen && (
            <div className="suggestion-panel add-food-pivot">
              <h3>Today&apos;s workout suggestion</h3>
              {fullRestSuggestion.suggest && (
                <div className="work-level-banner full-rest-banner" role="status">
                  <span className="work-level-label">Suggested full rest day</span>
                  <p className="work-level-desc muted small">{fullRestSuggestion.reason}</p>
                  <button type="button" className="btn btn-sm full-rest-btn" onClick={handleLogRestDay}>
                    Yes, I&apos;m resting today
                  </button>
                </div>
              )}
              <div className={`work-level-banner work-level-${workLevel.level}`} role="status">
                <span className="work-level-label">{workLevel.label}</span>
                <p className="work-level-desc muted small">{workLevel.description}</p>
              </div>
              <div className="suggestion-header-row">
                <p className="muted small suggestion-meta">
                  Next suggested session: <strong className="pill pill-next">{nextSuggested}</strong>
                  {' · '}
                  Library: <strong>{customExerciseLibrary ? 'Custom' : 'Baseline'}</strong>
                </p>
              </div>
            <p className="muted small">
              Choose session type and click Get workout for Bronze / Gold / Platinum options.
            </p>
            <div className="suggestion-controls">
              <select value={suggestionType} onChange={(e) => setSuggestionType(e.target.value)} className="workout-select">
                {WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button type="button" className="btn" onClick={getWorkoutFromLibraryClick}>
                Get workout
              </button>
              <button type="button" className="btn btn-ghost" onClick={getWorkoutFromAi} disabled={suggestionLoading}>
                {suggestionLoading ? 'Getting AI…' : 'Get AI suggestion'}
              </button>
            </div>
            {suggestionError && <p className="small snapshot-red">{suggestionError}</p>}
            {exerciseSuggestion && (
              <div className="suggestion-box">
                {exerciseSuggestion}
              </div>
            )}
            <p className="pivot-trigger muted small">
              <button type="button" className="btn-link" onClick={() => setLogWorkoutOpen(true)}>
                Log the workout
              </button>
            </p>
            </div>
          )}

          {logWorkoutOpen && (
            <div className="log-panel add-food-pivot">
            <button
              type="button"
              className="btn btn-ghost btn-back"
              onClick={() => setLogWorkoutOpen(false)}
            >
              ← Today&apos;s suggestion
            </button>
            <h3>Log workout</h3>
            <p className="muted small">Record what you did and which tier so future suggestions can progress you.</p>
            {lastWorkoutResult?.sessionType && (
              <div className="quick-log-box">
                <h4>Quick log from today&apos;s suggestion ({lastWorkoutResult.sessionType})</h4>
                <p className="muted small">Tick what you did and sets; we&apos;ll infer your tier for future suggestions. Add duration to fill the Workout time ring.</p>
                <form onSubmit={handleQuickLog} className="quick-log-form">
                  <div className="quick-log-duration">
                    <label>Duration (mins)</label>
                    <input type="number" min="0" value={quickLogDurationMins} onChange={(e) => setQuickLogDurationMins(e.target.value)} placeholder={String(workoutMinsGoal)} />
                  </div>
                  {TIERS.map((tier) => {
                    const list = lastWorkoutResult[tier.toLowerCase()] || []
                    if (list.length === 0) return null
                    return (
                      <div key={tier} className="quick-log-tier">
                        <strong className={`pill tier-${tier.toLowerCase()}`}>{tier}</strong>
                        <ul>
                          {list.map((ex) => {
                            const key = `${tier}-${ex.name}`
                            return (
                              <li key={key} className="quick-log-row">
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={!!quickLogChecked[key]}
                                    onChange={() => toggleQuickLog(key)}
                                  />
                                  <span>{ex.name}</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="sets"
                                  value={quickLogSets[key] ?? ''}
                                  onChange={(e) => setQuickLogSet(key, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                  <button type="submit" className="btn">Log from suggestion</button>
                </form>
              </div>
            )}
            <form onSubmit={handleLogWorkout} className="workout-log-form">
              <div className="input-group">
                <label>Session type</label>
                <select value={workoutType} onChange={(e) => setWorkoutType(e.target.value)}>
                  {WORKOUT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Tier you did</label>
                <select value={workoutTier} onChange={(e) => setWorkoutTier(e.target.value)}>
                  {TIERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Duration (mins)</label>
                <input
                  type="number"
                  min="0"
                  value={workoutDurationMins}
                  onChange={(e) => setWorkoutDurationMins(e.target.value)}
                  placeholder={`e.g. ${workoutMinsGoal}`}
                  title="Fills the Workout time ring"
                />
              </div>
              <div className="input-group">
                <label>Note (optional)</label>
                <input
                  type="text"
                  value={workoutNote}
                  onChange={(e) => setWorkoutNote(e.target.value)}
                  placeholder="e.g. 3 sets, knee push-ups"
                />
              </div>
              <button type="submit" className="btn">Log workout</button>
            </form>
            </div>
          )}
        </div>
      </section>

      {/* Workout history — flip-out like Log 1 / Log 2 on Weight */}
      <section className="workout-history-section">
        <button
          type="button"
          className="btn btn-ghost workout-history-toggle"
          onClick={() => setWorkoutHistoryOpen((o) => !o)}
          aria-expanded={workoutHistoryOpen}
          aria-controls="workout-history-panel"
        >
          {workoutHistoryOpen ? 'Hide workout history' : 'Workout history'}
          {exerciseLogs.filter((l) => l.workoutType).length > 0 && (
            <span className="workout-history-count"> ({exerciseLogs.filter((l) => l.workoutType).length})</span>
          )}
        </button>
        {workoutHistoryOpen && (
          <div id="workout-history-panel" className="card workout-history-card">
            <h3>Recent sessions</h3>
            <div className="recent-workouts">
              {exerciseLogs
                .filter((l) => l.workoutType)
                .slice(-10)
                .reverse()
                .map((l, i) => (
                  <div key={l.date + i} className="workout-row">
                    <span>{dateUtils.formatDate(l.date)}</span>
                    <span className={`pill pill-${l.workoutType.toLowerCase()}`}>{l.workoutType === 'Rest' ? 'Rest day' : l.workoutType}</span>
                    {l.tier && <span className={`pill tier-${l.tier.toLowerCase()}`}>{l.tier}</span>}
                    {l.exercisesDone?.length > 0 && (
                      <span className="muted small"> — {l.exercisesDone.map((d) => `${d.tier} ${d.exerciseName}`).join(', ')}</span>
                    )}
                  </div>
                ))}
              {exerciseLogs.filter((l) => l.workoutType).length === 0 && <p className="muted small">No workouts logged yet.</p>}
            </div>
          </div>
        )}
      </section>

      <PageFooter />
    </div>
  )
}
