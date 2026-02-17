import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { getWorkoutFromLibrary, formatWorkoutForDisplay, deriveEffectiveTier } from '../utils/workoutFromLibrary'
import { fetchExerciseSuggestion, fetchAndUpdateExerciseLibrary } from '../services/ai'
import { getGoogleFitToken, fetchStepsToday } from '../services/googleFit'
import PageFooter from '../components/PageFooter'
import './Exercise.css'

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Mobility', 'Cardio']
const TIERS = ['Bronze', 'Gold', 'Platinum']

/** Pre-defined equipment options for checkboxes. Value is stored and matched in workout filtering. */
const EQUIPMENT_OPTIONS = [
  { id: 'kb4', label: 'Kettlebell 4kg', value: 'Kettlebell 4kg' },
  { id: 'kb6', label: 'Kettlebell 6kg', value: 'Kettlebell 6kg' },
  { id: 'kb8', label: 'Kettlebell 8kg', value: 'Kettlebell 8kg' },
  { id: 'kb12', label: 'Kettlebell 12kg', value: 'Kettlebell 12kg' },
  { id: 'kb16', label: 'Kettlebell 16kg', value: 'Kettlebell 16kg' },
  { id: 'band', label: 'Resistance band', value: 'Resistance band' },
  { id: 'curlbar', label: 'Curl bar with plates', value: 'Curl bar with plates' },
  { id: 'barbell', label: 'Barbell with plates', value: 'Barbell with plates' },
  { id: 'dumbbells', label: 'Dumbbells', value: 'Dumbbells' },
  { id: 'pullup', label: 'Pull-up bar', value: 'Pull-up bar' },
  { id: 'bench', label: 'Bench', value: 'Bench' },
  { id: 'chair', label: 'Chair', value: 'Chair' },
  { id: 'wall', label: 'Wall', value: 'Wall' },
  { id: 'mat', label: 'Yoga mat / floor', value: 'Yoga mat / floor' },
]

export default function Exercise() {
  const {
    weight,
    personalDetails,
    exerciseGoals,
    exerciseLogs,
    exerciseSuggestion,
    customExerciseLibrary,
    lastWorkoutResult,
    setGoals,
    logExercise,
    updateExerciseLog,
    setExerciseSuggestion,
    setExerciseLibrary,
    setLastWorkoutResult,
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

  const [stepsInput, setStepsInput] = useState(todayLog?.steps?.toString() ?? '')
  const [workoutType, setWorkoutType] = useState('Push')
  const [workoutTier, setWorkoutTier] = useState('Gold')
  const [workoutNote, setWorkoutNote] = useState('')
  const [suggestionType, setSuggestionType] = useState('Push')
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [updateLibraryLoading, setUpdateLibraryLoading] = useState(false)
  const [updateLibraryError, setUpdateLibraryError] = useState('')
  const [updateLibrarySuccess, setUpdateLibrarySuccess] = useState(false)
  const [quickLogChecked, setQuickLogChecked] = useState({})
  const [quickLogSets, setQuickLogSets] = useState({})
  const [stepsSyncLoading, setStepsSyncLoading] = useState(false)
  const [stepsSyncError, setStepsSyncError] = useState('')
  const stepsSyncIntervalRef = useRef(null)

  const lastLogged = exerciseLogs.filter((l) => l.workoutType).slice(-1)[0]
  const nextSuggested = lastLogged
    ? WORKOUT_TYPES[(WORKOUT_TYPES.indexOf(lastLogged.workoutType) + 1) % WORKOUT_TYPES.length]
    : 'Push'

  const recentTierLogs = exerciseLogs.filter((l) => l.workoutType).slice(-10)

  const getWorkoutFromLibraryClick = useCallback(() => {
    setSuggestionError('')
    const workout = getWorkoutFromLibrary(
      suggestionType,
      latestWeight,
      recentTierLogs,
      customExerciseLibrary,
      userEquipment,
      personalDetails?.goalExerciseLevel || null
    )
    const text = formatWorkoutForDisplay(workout)
    setExerciseSuggestion(text)
    setLastWorkoutResult({ ...workout, sessionType: suggestionType })
    setQuickLogChecked({})
    setQuickLogSets({})
  }, [suggestionType, latestWeight, recentTierLogs, customExerciseLibrary, userEquipment, personalDetails?.goalExerciseLevel, setExerciseSuggestion, setLastWorkoutResult])

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
      })
      setExerciseSuggestion(text)
    } catch (err) {
      setSuggestionError(err.message || 'Failed to get suggestion.')
    } finally {
      setSuggestionLoading(false)
    }
  }, [aiApiKey, aiProvider, suggestionType, weight, exerciseLogs, todayLog?.steps, setExerciseSuggestion])

  const handleUpdateWorkoutSuggestions = useCallback(async () => {
    const key = aiApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('body-health-app-data-apikey') : null)
    if (!key) {
      setUpdateLibraryError('Add and save an API key on Weight & Body first.')
      return
    }
    setUpdateLibraryError('')
    setUpdateLibrarySuccess(false)
    setUpdateLibraryLoading(true)
    try {
      const library = await fetchAndUpdateExerciseLibrary(aiProvider, key, userEquipment)
      if (library) {
        setExerciseLibrary(library)
        setUpdateLibrarySuccess(true)
        setTimeout(() => setUpdateLibrarySuccess(false), 3000)
      } else {
        setUpdateLibraryError('AI response could not be parsed as a valid exercise library. Try again.')
      }
    } catch (err) {
      setUpdateLibraryError(err.message || 'Failed to update library.')
    } finally {
      setUpdateLibraryLoading(false)
    }
  }, [aiApiKey, aiProvider, userEquipment, setExerciseLibrary])

  const googleClientId = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID

  const syncStepsFromGoogleFit = useCallback(
    (silent = false) => {
      if (!googleClientId) {
        if (!silent) setStepsSyncError('Add VITE_GOOGLE_CLIENT_ID to .env (Google Cloud OAuth Web client ID).')
        return
      }
      setStepsSyncError('')
      setStepsSyncLoading(true)
      getGoogleFitToken(googleClientId, !silent)
        .then((token) => fetchStepsToday(token))
        .then(({ steps }) => {
          if (todayLog) updateExerciseLog(todayKey, { steps })
          else logExercise({ date: todayKey, steps })
          setGoals({ stepsLastSyncedAt: new Date().toISOString() })
          setStepsInput(String(steps))
        })
        .catch((err) => {
          if (!silent) setStepsSyncError(err.message || 'Sync failed.')
        })
        .finally(() => setStepsSyncLoading(false))
    },
    [googleClientId, todayKey, todayLog, logExercise, updateExerciseLog, setGoals]
  )

  useEffect(() => {
    if (!autoSyncSteps || !googleClientId) return
    const run = () => syncStepsFromGoogleFit(true)
    run()
    stepsSyncIntervalRef.current = setInterval(run, 60 * 60 * 1000)
    return () => {
      if (stepsSyncIntervalRef.current) clearInterval(stepsSyncIntervalRef.current)
    }
  }, [autoSyncSteps, googleClientId, todayKey, syncStepsFromGoogleFit])

  const handleLogSteps = (e) => {
    e.preventDefault()
    const val = parseInt(stepsInput, 10)
    if (!Number.isInteger(val) || val < 0) return
    if (todayLog) updateExerciseLog(todayKey, { steps: val })
    else logExercise({ date: todayKey, steps: val })
    setStepsInput('')
  }

  const handleLogWorkout = (e) => {
    e.preventDefault()
    const newRotation = [...(exerciseGoals.pplRotation || []), { date: todayKey, type: workoutType }]
    setGoals({ pplRotation: newRotation })
    const payload = {
      date: todayKey,
      workoutType,
      tier: workoutTier,
      workoutNote: workoutNote || undefined,
    }
    if (todayLog) updateExerciseLog(todayKey, payload)
    else logExercise(payload)
    setWorkoutNote('')
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
    const payload = {
      date: todayKey,
      workoutType: lastWorkoutResult.sessionType,
      tier: effectiveTier,
      exercisesDone: exercisesDone.length ? exercisesDone : undefined,
      workoutNote: exercisesDone.length ? `Quick log: ${exercisesDone.map((d) => `${d.tier} ${d.exerciseName}${d.sets ? ` ${d.sets} sets` : ''}`).join('; ')}` : undefined,
    }
    if (todayLog) updateExerciseLog(todayKey, payload)
    else logExercise(payload)
    setQuickLogChecked({})
    setQuickLogSets({})
  }

  const toggleQuickLog = (key) => {
    setQuickLogChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const setQuickLogSet = (key, val) => {
    setQuickLogSets((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <div className="exercise-page">
      <h1 className="page-title">Exercise</h1>
      <p className="page-intro muted">
        Today&apos;s suggested workout (Bronze / Gold / Platinum) and logging. Tiers are based on ability and how you feel—pick what fits you. We use your recent tier and goal to nudge progress.
      </p>

      {/* Equipment I have */}
      <section className="card equipment-card">
        <h3>Equipment I have</h3>
        <p className="muted small">Tick what you have; workout suggestions will only show exercises you can do with these.</p>
        <div className="equipment-checkboxes">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <label key={opt.id} className="equipment-option">
              <input
                type="checkbox"
                checked={userEquipment.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setGoals({ equipment: [...userEquipment, opt.value] })
                  } else {
                    setGoals({ equipment: userEquipment.filter((v) => v !== opt.value) })
                  }
                }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Today's workout suggestion */}
      <section className="card suggestion-card">
        <h3>Today&apos;s workout suggestion</h3>
        <p className="muted small">
          Next suggested session: <strong className="pill pill-next">{nextSuggested}</strong>
          {' · '}
          Library: <strong>{customExerciseLibrary ? 'AI-updated' : 'Baseline'}</strong>
        </p>
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

        <div className="update-library-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleUpdateWorkoutSuggestions}
            disabled={updateLibraryLoading}
          >
            {updateLibraryLoading ? 'Searching & updating…' : 'Update workout suggestions'}
          </button>
          <span className="muted small">Uses AI to search and refresh the exercise library (saved in browser).</span>
        </div>
        {updateLibraryError && <p className="small snapshot-red">{updateLibraryError}</p>}
        {updateLibrarySuccess && <p className="small snapshot-green">Library updated. Get workout will now use the new list.</p>}
      </section>

      {/* Steps */}
      <div className="exercise-grid">
        <section className="card">
          <h3>Log today&apos;s steps</h3>
          <form onSubmit={handleLogSteps}>
            <div className="input-group">
              <label>Steps ({dateUtils.formatDate(todayKey)})</label>
              <input
                type="number"
                min="0"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                placeholder={todayLog?.steps?.toString() ?? 'e.g. 5500'}
              />
            </div>
            <button type="submit" className="btn" disabled={stepsInput === ''}>
              {todayLog ? 'Update steps' : 'Log steps'}
            </button>
          </form>

          <div className="steps-connect-card">
            <h4>Steps from phone (Google Fit)</h4>
            <p className="muted small">
              Samsung Health doesn&apos;t offer a web API. If you sync Samsung Health to Google Fit (or use Google Fit on your phone), connect below to pull steps here. Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>.env</code> (Google Cloud OAuth Web client ID, Fitness API enabled).
            </p>
            <div className="steps-connect-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => syncStepsFromGoogleFit(false)}
                disabled={stepsSyncLoading || !googleClientId}
              >
                {stepsSyncLoading ? 'Syncing…' : 'Connect & sync steps'}
              </button>
              <label className="steps-auto-sync">
                <input
                  type="checkbox"
                  checked={autoSyncSteps}
                  onChange={(e) => setGoals({ autoSyncSteps: e.target.checked })}
                />
                <span>Auto-sync every 1 hour</span>
              </label>
            </div>
            {stepsLastSyncedAt && (
              <p className="muted small">Last synced: {new Date(stepsLastSyncedAt).toLocaleString()}</p>
            )}
            {stepsSyncError && <p className="small snapshot-red">{stepsSyncError}</p>}
          </div>

          {todayLog?.steps != null && (
            <p className="steps-status">
              Today: <strong>{todayLog.steps.toLocaleString()}</strong> / {exerciseGoals.stepsDaily?.toLocaleString() ?? 6000}
              <span className={todayLog.steps >= (exerciseGoals.stepsDaily ?? 6000) ? ' snapshot-green' : ' snapshot-orange'}>
                {todayLog.steps >= (exerciseGoals.stepsDaily ?? 6000) ? ' ✓' : ''}
              </span>
            </p>
          )}
        </section>
      </div>

      {/* Log workout (with tier) */}
      <section className="card">
        <h3>Log workout</h3>
        <p className="muted small">Record what you did and which tier (Bronze / Gold / Platinum) so future suggestions can progress you.</p>

        {lastWorkoutResult?.sessionType && (
          <div className="quick-log-box">
            <h4>Quick log from today&apos;s suggestion ({lastWorkoutResult.sessionType})</h4>
            <p className="muted small">Tick what you did and sets; we&apos;ll infer your tier (e.g. legs = Gold) for future suggestions.</p>
            <form onSubmit={handleQuickLog} className="quick-log-form">
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
        <div className="recent-workouts">
          <h4>Recent sessions</h4>
          {exerciseLogs
            .filter((l) => l.workoutType)
            .slice(-10)
            .reverse()
            .map((l, i) => (
              <div key={l.date + i} className="workout-row">
                <span>{dateUtils.formatDate(l.date)}</span>
                <span className={`pill pill-${l.workoutType.toLowerCase()}`}>{l.workoutType}</span>
                {l.tier && <span className={`pill tier-${l.tier.toLowerCase()}`}>{l.tier}</span>}
                {l.exercisesDone?.length > 0 && (
                  <span className="muted small"> — {l.exercisesDone.map((d) => `${d.tier} ${d.exerciseName}`).join(', ')}</span>
                )}
              </div>
            ))}
          {exerciseLogs.filter((l) => l.workoutType).length === 0 && <p className="muted small">No workouts logged yet.</p>}
        </div>
      </section>
      <PageFooter />
    </div>
  )
}
