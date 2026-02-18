import React, { useState, useEffect } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { bmi, averageRateKgPerWeek, weeksToGoal, requiredRateKgPerWeek } from '../utils/personalStats'
import { getRecommendedNutrition, formatRecommendedRange, getActualExerciseLevel, DIET_PATTERN_LABELS } from '../utils/recommendedNutrition'
import { TIMEZONE_OPTIONS } from '../utils/timezones'
import PageFooter from '../components/PageFooter'
import './Personal.css'

const GOAL_EXERCISE_LEVELS = ['Bronze', 'Gold', 'Platinum']
const LOSS_RATE_OPTIONS = [
  { value: 'Bronze', label: 'Bronze — 0–0.5 kg/week' },
  { value: 'Gold', label: 'Gold — 0.5–1 kg/week' },
  { value: 'Platinum', label: 'Platinum — 1+ kg/week' },
]
const DEFAULT_TIMEZONE = 'Pacific/Auckland'

export default function Personal() {
  const { profileCode, weight, personalDetails, exerciseGoals, exerciseLogs, nutritionLogs, setPersonalDetails, setGoals, loadProfile, clearProfile } = useHealth()
  const dateUtils = useDateUtils()
  const [switchCode, setSwitchCode] = useState('')
  const [age, setAge] = useState(personalDetails?.age?.toString() ?? '')
  const [heightCm, setHeightCm] = useState(personalDetails?.heightCm?.toString() ?? '')
  const [startingWeightKg, setStartingWeightKg] = useState(personalDetails?.startingWeightKg?.toString() ?? '')
  const [goalWeightKg, setGoalWeightKg] = useState(personalDetails?.goalWeightKg?.toString() ?? '')
  const [goalExerciseLevel, setGoalExerciseLevel] = useState(personalDetails?.goalExerciseLevel ?? 'Gold')
  const [desiredLossRateTier, setDesiredLossRateTier] = useState(personalDetails?.desiredLossRateTier ?? 'Gold')
  const [timeZone, setTimeZone] = useState(personalDetails?.timeZone ?? DEFAULT_TIMEZONE)
  const [stepsDaily, setStepsDaily] = useState((exerciseGoals?.stepsDaily ?? 6000).toString())

  useEffect(() => {
    setAge(personalDetails?.age?.toString() ?? '')
    setHeightCm(personalDetails?.heightCm?.toString() ?? '')
    setStartingWeightKg(personalDetails?.startingWeightKg?.toString() ?? '')
    setGoalWeightKg(personalDetails?.goalWeightKg?.toString() ?? '')
    setGoalExerciseLevel(personalDetails?.goalExerciseLevel ?? 'Gold')
    setDesiredLossRateTier(personalDetails?.desiredLossRateTier ?? 'Gold')
    setTimeZone(personalDetails?.timeZone ?? DEFAULT_TIMEZONE)
    setStepsDaily((exerciseGoals?.stepsDaily ?? 6000).toString())
  }, [personalDetails?.age, personalDetails?.heightCm, personalDetails?.startingWeightKg, personalDetails?.goalWeightKg, personalDetails?.goalExerciseLevel, personalDetails?.desiredLossRateTier, personalDetails?.timeZone, exerciseGoals?.stepsDaily])

  const handleSave = (e) => {
    e.preventDefault()
    setPersonalDetails({
      age: age.trim() ? parseInt(age, 10) : null,
      heightCm: heightCm.trim() ? parseFloat(heightCm) : null,
      startingWeightKg: startingWeightKg.trim() ? parseFloat(startingWeightKg) : null,
      goalWeightKg: goalWeightKg.trim() ? parseFloat(goalWeightKg) : null,
      goalExerciseLevel: goalExerciseLevel || 'Gold',
      desiredLossRateTier: desiredLossRateTier || 'Gold',
      timeZone: timeZone || DEFAULT_TIMEZONE,
    })
    const stepsNum = parseInt(stepsDaily, 10)
    if (!Number.isNaN(stepsNum) && stepsNum > 0) setGoals({ stepsDaily: stepsNum })
  }

  const weightList = Array.isArray(weight) ? weight : []
  const sortedWeight = [...weightList].sort((a, b) => new Date(a.date) - new Date(b.date))
  const currentWeight = sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1].value : null
  const startKg = personalDetails?.startingWeightKg ?? (sortedWeight.length > 0 ? sortedWeight[0].value : null)
  const goalKg = personalDetails?.goalWeightKg ?? null
  const height = personalDetails?.heightCm ?? null

  const bmiCurrent = height != null && currentWeight != null ? bmi(currentWeight, height) : null
  const bmiStart = height != null && startKg != null ? bmi(startKg, height) : null
  const bmiGoal = height != null && goalKg != null ? bmi(goalKg, height) : null
  const kgToGo = currentWeight != null && goalKg != null ? goalKg - currentWeight : null
  const ratePerWeek = averageRateKgPerWeek(sortedWeight)
  const weeksAtCurrentRate = currentWeight != null && goalKg != null && ratePerWeek != null && ratePerWeek < 0
    ? weeksToGoal(currentWeight, goalKg, ratePerWeek)
    : null
  const requiredRate26 = currentWeight != null && goalKg != null ? requiredRateKgPerWeek(currentWeight, goalKg, 26) : null
  const recentDayKeys = dateUtils.getWeekKeys(14)
  const recommendedNutrition = getRecommendedNutrition(personalDetails ?? {}, currentWeight, {
    nutritionLogs: nutritionLogs ?? [],
    dayKeys: recentDayKeys,
  })
  const recommendedRangeText = formatRecommendedRange(recommendedNutrition)
  const actualExerciseLevel = getActualExerciseLevel(exerciseLogs ?? [], 15)
  const goalExerciseLevelDisplay = personalDetails?.goalExerciseLevel ?? 'Gold'
  const showActivityNote = actualExerciseLevel && actualExerciseLevel !== goalExerciseLevelDisplay
  const lossRateTierDisplay = personalDetails?.desiredLossRateTier ?? 'Gold'
  const lossRateLabel = goalKg != null && currentWeight != null && currentWeight - goalKg > 1
    ? { Bronze: '0–0.5', Gold: '0.5–1', Platinum: '1+' }[lossRateTierDisplay]
    : null

  const handleSwitchProfile = (e) => {
    e.preventDefault()
    if (switchCode.trim()) loadProfile(switchCode.trim())
    setSwitchCode('')
  }

  return (
    <div className="personal-page">
      <h1 className="page-title">Personal details</h1>
      <p className="page-intro muted">
        Age, height, starting weight and goals. Used for BMI, rate-of-loss and insights across the app.
      </p>

      <section className="card profile-section">
        <h3>Your profile</h3>
        <p className="muted small">Use this code on another device to load your data. Keep it private.</p>
        <div className="profile-code-row">
          <code className="profile-code">{profileCode}</code>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigator.clipboard?.writeText(profileCode)}
          >
            Copy
          </button>
        </div>
        <form onSubmit={handleSwitchProfile} className="profile-switch-form">
          <input
            type="text"
            placeholder="Enter another code"
            value={switchCode}
            onChange={(e) => setSwitchCode(e.target.value.toUpperCase())}
            className="profile-switch-input"
            maxLength={12}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Load that profile</button>
        </form>
        <button type="button" className="btn btn-ghost btn-sm profile-leave" onClick={clearProfile}>
          Leave profile (return to login)
        </button>
      </section>

      <section className="card">
        <h3>Your details</h3>
        <form onSubmit={handleSave} className="personal-form">
          <div className="input-row">
            <div className="input-group">
              <label>Age</label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 38"
              />
            </div>
            <div className="input-group">
              <label>Height (cm)</label>
              <input
                type="number"
                step="0.1"
                min="100"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 178"
              />
            </div>
          </div>
          <div className="input-row">
            <div className="input-group">
              <label>Starting weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={startingWeightKg}
                onChange={(e) => setStartingWeightKg(e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
            <div className="input-group">
              <label>Goal weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(e.target.value)}
                placeholder="e.g. 107"
              />
            </div>
          </div>
          <div className="input-group">
            <label>Goal exercise level</label>
            <select value={goalExerciseLevel} onChange={(e) => setGoalExerciseLevel(e.target.value)}>
              {GOAL_EXERCISE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <p className="input-hint muted small">Activity level you want to be at (feeds energy calculation).</p>
          </div>
          <div className="input-group">
            <label>Desired weight loss rate</label>
            <select value={desiredLossRateTier} onChange={(e) => setDesiredLossRateTier(e.target.value)}>
              {LOSS_RATE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="input-hint muted small">When you have a goal weight below current, this sets the calorie deficit.</p>
          </div>
          <div className="input-group">
            <label>Timezone</label>
            <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {TIMEZONE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="input-hint muted small">Used for &quot;today&quot; and all dates across the app.</p>
          </div>
          <div className="input-group">
            <label>Daily steps goal</label>
            <input
              type="number"
              min="0"
              value={stepsDaily}
              onChange={(e) => setStepsDaily(e.target.value)}
              placeholder="e.g. 6000"
            />
            <p className="input-hint muted small">Target steps per day; used on Exercise and Dashboard.</p>
          </div>
          <button type="submit" className="btn">Save</button>
        </form>
      </section>

      {recommendedRangeText && (
        <section className="card">
          <h3>Recommended daily nutrition</h3>
          <p className="muted small">Based on your details (height, weight, age, goal and activity level), the recommended range is:</p>
          <p className="recommended-range">{recommendedRangeText}</p>
          {lossRateLabel != null && recommendedNutrition?._inDeficit && (
            <p className="muted small">Weight loss rate: {lossRateTierDisplay} = {lossRateLabel} kg/week; deficit applied to calories.</p>
          )}
          {recommendedNutrition?._dietPattern && recommendedNutrition._dietPattern !== 'balanced' && (
            <p className="muted small">Your recent eating looks {DIET_PATTERN_LABELS[recommendedNutrition._dietPattern] ?? recommendedNutrition._dietPattern} — suggested macros are adjusted accordingly.</p>
          )}
          {showActivityNote && (
            <p className="activity-note muted small">You&apos;re aiming for <strong>{goalExerciseLevelDisplay}</strong> activity, but lately you&apos;ve been at <strong>{actualExerciseLevel}</strong>.</p>
          )}
          <p className="muted small">The Nutrition page uses this for your traffic light and daily totals.</p>
        </section>
      )}

      <section className="card">
        <h3>Calculated</h3>
        <p className="muted small">From your details and weight log. Other pages use these for insights and suggestions.</p>
        <dl className="personal-stats">
          {bmiCurrent != null && (
            <>
              <dt>BMI (current)</dt>
              <dd>{bmiCurrent.toFixed(1)}</dd>
            </>
          )}
          {bmiStart != null && (
            <>
              <dt>BMI (start)</dt>
              <dd>{bmiStart.toFixed(1)}</dd>
            </>
          )}
          {bmiGoal != null && (
            <>
              <dt>BMI (goal)</dt>
              <dd>{bmiGoal.toFixed(1)}</dd>
            </>
          )}
          {kgToGo != null && (
            <>
              <dt>Kg to goal</dt>
              <dd>{kgToGo > 0 ? `${kgToGo.toFixed(1)} kg to lose` : kgToGo < 0 ? `${Math.abs(kgToGo).toFixed(1)} kg above goal` : 'At goal'}</dd>
            </>
          )}
          {ratePerWeek != null && (
            <>
              <dt>Current rate</dt>
              <dd>{ratePerWeek < 0 ? `${ratePerWeek.toFixed(2)} kg/week (losing)` : ratePerWeek > 0 ? `+${ratePerWeek.toFixed(2)} kg/week` : 'Stable'}</dd>
            </>
          )}
          {weeksAtCurrentRate != null && weeksAtCurrentRate > 0 && (
            <>
              <dt>Weeks to goal (at current rate)</dt>
              <dd>~{Math.round(weeksAtCurrentRate)} weeks</dd>
            </>
          )}
          {requiredRate26 != null && kgToGo != null && kgToGo > 0 && (
            <>
              <dt>Rate needed to reach goal in 6 months</dt>
              <dd>{requiredRate26.toFixed(2)} kg/week</dd>
            </>
          )}
        </dl>
        {!bmiCurrent && !ratePerWeek && (
          <p className="muted small">Add height and weight log (or starting weight) to see BMI and rate.</p>
        )}
      </section>

      <PageFooter />
    </div>
  )
}
