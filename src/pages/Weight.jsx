import React, { useState } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { getDateKeyOffset, formatLongMonth } from '../utils/date'
import { bmi, bmiCategory, rateInterpretation } from '../utils/personalStats'
import { fetchAiInsights } from '../services/ai'
import PageFooter from '../components/PageFooter'
import './Weight.css'

const MEASUREMENT_NAMES = ['Belly', 'Chest', 'Hips/Butt', 'Upper Arm', 'Waist', 'Thigh (L)', 'Thigh (R)']

/**
 * Build rich local insights (no API). Returns array of paragraphs/sentences for display.
 */
function getLocalInsights(options) {
  const {
    currentWeight,
    startWeight,
    goalWeight,
    firstLogDateKey,
    timeZone,
    heightCm,
    age,
    rateKgPerWeek,
    logCount28,
    waistCm,
  } = options

  const lines = []

  if (currentWeight == null) {
    return ['Log a weight to see your insights here. Add age and height in Personal details for BMI and journey stats.']
  }

  // —— Current & BMI ——
  let intro = `You’re at ${currentWeight} kg.`
  if (heightCm != null) {
    const bmiVal = bmi(currentWeight, heightCm)
    const category = bmiCategory(bmiVal)
    intro += ` BMI ${bmiVal.toFixed(1)} (${category?.label ?? '—'})`
    if (category?.shortTip) intro += ` — ${category.shortTip}`
    intro += '.'
  }
  if (age != null) intro += ` Age ${age}.`
  lines.push(intro)

  // —— Waist-to-height ——
  if (waistCm != null && heightCm != null && heightCm > 0) {
    const threshold = (heightCm / 2).toFixed(0)
    if (waistCm > heightCm / 2) {
      lines.push(`Waist ${waistCm} cm is above half your height (${threshold} cm). A simple rule of thumb: keeping waist under half your height is linked to better long-term health.`)
    } else {
      lines.push(`Waist ${waistCm} cm is under half your height—that’s a good place to be for your insides.`)
    }
  }

  // —— Journey (from start date, progress-focused phrases) ——
  if (startWeight != null || goalWeight != null) {
    const start = startWeight ?? currentWeight
    const lost = start - currentWeight
    const pctLostFromStart = start > 0 ? ((lost / start) * 100) : 0
    const startDateText = firstLogDateKey ? formatLongMonth(firstLogDateKey, timeZone) : null
    const journeyStart = startDateText
      ? `From where you started in ${startDateText}, you’re ${lost >= 0 ? `${lost.toFixed(1)} kg down` : `${Math.abs(lost).toFixed(1)} kg up`}.`
      : `From where you started, you’re ${lost >= 0 ? `${lost.toFixed(1)} kg down` : `${Math.abs(lost).toFixed(1)} kg up`}.`
    if (goalWeight != null && goalWeight !== start) {
      const totalToLose = start - goalWeight
      const toGo = currentWeight - goalWeight
      if (totalToLose > 0 && toGo > 0) {
        const pct = Math.min(100, Math.round(((start - currentWeight) / totalToLose) * 100))
        const progressPhrase = pct >= 85 ? 'Almost there' : pct >= 50 ? 'Crushing it' : pct >= 20 ? 'a fair way to go' : 'a long way to go'
        const progressLine = (progressPhrase === 'Almost there' || progressPhrase === 'Crushing it')
          ? `${journeyStart} ${progressPhrase}—you’re ${pct}% there!`
          : `${journeyStart} You’ve got ${progressPhrase}, but you’re ${pct}% there!`
        lines.push(progressLine)
      } else if (toGo <= 0) {
        lines.push(`${journeyStart} You’re at or under your goal—nice one.`)
      } else {
        lines.push(journeyStart)
      }
    } else {
      lines.push(journeyStart)
    }
    if (lost > 0 && pctLostFromStart >= 5 && pctLostFromStart < 10) {
      lines.push('You’ve passed 5% loss from where you started—that’s a real milestone. Bodies often respond with better blood pressure and energy.')
    } else if (lost > 0 && pctLostFromStart >= 10) {
      lines.push('10%+ down from start—that’s serious progress. Hearts and joints tend to thank you for it.')
    }
  }

  // —— Rate ——
  if (rateKgPerWeek != null) {
    const rate = rateKgPerWeek
    const tip = rateInterpretation(rate)
    lines.push(`Right now you’re at ${rate < 0 ? rate.toFixed(2) : `+${rate.toFixed(2)}`} kg/week. ${tip}`)
  }

  // —— Logging ——
  if (logCount28 != null && logCount28 > 0) {
    if (logCount28 >= 4) lines.push(`You’ve logged ${logCount28} times in the last 28 days—solid consistency.`)
    else if (logCount28 >= 2) lines.push(`A few more logs over the next few weeks will sharpen your trends.`)
    else lines.push('Log a bit more often when you can—it’ll make the trends and rate clearer.')
  }

  if (lines.length === 0) return ['Add weight and, if you like, Personal details for richer insights.']
  return lines
}

/**
 * Trend from logs in a date window. endDateKey is the reference date (e.g. today).
 * Uses only entries where startDateKey <= date <= endDateKey; trend = last − first by date.
 */
function getWeightTrendInWindow(weightRows, startDateKey, endDateKey) {
  const inRange = weightRows.filter((w) => w.date >= startDateKey && w.date <= endDateKey)
  if (inRange.length < 2) return null
  const sorted = [...inRange].sort((a, b) => new Date(a.date) - new Date(b.date))
  const first = sorted[0].value
  const last = sorted[sorted.length - 1].value
  return {
    delta: last - first,
    first,
    last,
    from: sorted[0].date,
    to: sorted[sorted.length - 1].date,
    count: sorted.length,
  }
}

export default function Weight() {
  const {
    weight,
    measurements,
    personalDetails,
    addWeight,
    addMeasurement,
    updateWeight,
    deleteWeight,
    updateMeasurement,
    deleteMeasurement,
    aiApiKey,
    aiProvider,
    aiInsights,
    setAiApiKey,
    setAiInsights,
  } = useHealth()

  const dateUtils = useDateUtils()
  const today = dateUtils.getTodayKey()
  const [weightLogDate, setWeightLogDate] = useState(today)
  const [weightVal, setWeightVal] = useState('')
  const [weightPhase, setWeightPhase] = useState('')
  const [measLogDate, setMeasLogDate] = useState(today)
  const [measName, setMeasName] = useState('Belly')
  const [measVal, setMeasVal] = useState('')
  const [aiKeyInput, setAiKeyInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [expandWeightLog, setExpandWeightLog] = useState(false)
  const [expandMeasLog, setExpandMeasLog] = useState(false)
  const [editingWeight, setEditingWeight] = useState(null)
  const [editingMeasurement, setEditingMeasurement] = useState(null)
  const weightList = Array.isArray(weight) ? weight : []
  const weightCampaignRows = [...weightList].sort((a, b) => new Date(a.date) - new Date(b.date))
  const currentWeight = weightCampaignRows.length > 0 ? weightCampaignRows[weightCampaignRows.length - 1].value : null

  // Trend reference = date of your most recent log (so windows always use your data)
  const lastLogDate = weightCampaignRows.length > 0 ? weightCampaignRows[weightCampaignRows.length - 1].date : null
  const trendEndDate = typeof lastLogDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastLogDate) ? lastLogDate : today
  const trendReferenceDateFormatted = dateUtils.formatLongDate(trendEndDate)

  // Trends: windows ending at your last log date, using only logs in each window
  const weightTrend7 = getWeightTrendInWindow(weightCampaignRows, getDateKeyOffset(trendEndDate, 7), trendEndDate)
  const weightTrend14 = getWeightTrendInWindow(weightCampaignRows, getDateKeyOffset(trendEndDate, 14), trendEndDate)
  const weightTrend28 = getWeightTrendInWindow(weightCampaignRows, getDateKeyOffset(trendEndDate, 28), trendEndDate)
  const weightTrend90 = getWeightTrendInWindow(weightCampaignRows, getDateKeyOffset(trendEndDate, 90), trendEndDate)

  const runInsights = React.useCallback(async (dataOverride) => {
    const key = aiApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('body-health-app-data-apikey') : null)
    if (!key) {
      setAiError('Add and save an API key first (or set VITE_GEMINI_API_KEY in .env).')
      return
    }
    setAiError('')
    setAiLoading(true)
    try {
      const base = { weight, measurements, personalDetails: personalDetails || null }
      const payload = dataOverride ? { ...base, ...dataOverride } : base
      const insights = await fetchAiInsights(aiProvider, key, payload)
      setAiInsights(insights)
    } catch (err) {
      setAiError(err.message || 'Failed to generate insights.')
    } finally {
      setAiLoading(false)
    }
  }, [aiApiKey, aiProvider, weight, measurements, personalDetails, setAiInsights])

  const handleAddWeight = (e) => {
    e.preventDefault()
    const v = parseFloat(weightVal)
    if (!Number.isFinite(v)) return
    const date = weightLogDate || today
    addWeight(date, v, '', weightPhase)
    setWeightVal('')
    setWeightPhase('')
    setWeightLogDate(today)
    const nextWeight = [...weightList, { date, value: v, note: '', phase: weightPhase }].sort((a, b) => new Date(a.date) - new Date(b.date))
    runInsights({ weight: nextWeight, measurements })
  }

  const handleAddMeasurement = (e) => {
    e.preventDefault()
    const v = parseFloat(measVal)
    if (!Number.isFinite(v)) return
    const date = measLogDate || today
    addMeasurement(date, measName, v, 'cm')
    setMeasVal('')
    setMeasLogDate(today)
    const nextMeas = [...measurements, { date, name: measName, value: v, unit: 'cm' }].sort((a, b) => new Date(a.date) - new Date(b.date))
    runInsights({ weight, measurements: nextMeas })
  }

  const handleSaveAiKey = () => {
    setAiApiKey(aiKeyInput.trim())
    setAiKeyInput('')
  }

  const handleFetchInsights = () => runInsights()

  const referenceWeight = weightCampaignRows[0]?.value

  // Volume & Measurement Delta: pivot by measurement name, columns = dates
  const measList = Array.isArray(measurements) ? measurements : []
  const measDates = [...new Set(measList.map((m) => m.date))].sort((a, b) => new Date(a) - new Date(b)).slice(-10)
  const measNames = [...new Set(measList.map((m) => m.name))]
  const measByKey = measList.reduce((acc, m) => {
    acc[`${m.name}|${m.date}`] = m.value
    return acc
  }, {})

  // Measurement summary: latest value per area (most recent date per name)
  const latestByArea = {}
  measNames.forEach((name) => {
    const entries = measList.filter((m) => m.name === name).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (entries.length > 0) latestByArea[name] = { value: entries[0].value, date: entries[0].date }
  })
  const measTrend28 = (() => {
    const d28 = getDateKeyOffset(today, 28)
    const inRange = measList.filter((m) => m.date >= d28 && m.date <= today)
    if (inRange.length < 2) return null
    const byName = {}
    inRange.forEach((m) => {
      if (!byName[m.name] || byName[m.name].date < m.date) byName[m.name] = { value: m.value, date: m.date }
    })
    const firstByDate = {}
    inRange.forEach((m) => {
      if (!firstByDate[m.name] || firstByDate[m.name].date > m.date) firstByDate[m.name] = { value: m.value, date: m.date }
    })
    let totalFirst = 0
    let totalLast = 0
    Object.keys(byName).forEach((name) => {
      if (firstByDate[name]) totalFirst += firstByDate[name].value
      totalLast += byName[name].value
    })
    if (totalFirst === 0) return null
    return { delta: totalLast - totalFirst, totalFirst, totalLast }
  })()

  // Extra data for rich insights
  const startWeight = personalDetails?.startingWeightKg ?? (weightCampaignRows.length > 0 ? weightCampaignRows[0].value : null)
  const goalWeight = personalDetails?.goalWeightKg ?? null
  const rateKgPerWeek = (() => {
    if (!weightCampaignRows.length || weightCampaignRows.length < 2) return null
    const first = weightCampaignRows[0]
    const last = weightCampaignRows[weightCampaignRows.length - 1]
    const days = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)
    if (days <= 0) return null
    return (last.value - first.value) / (days / 7)
  })()
  const d28 = getDateKeyOffset(trendEndDate, 28)
  const logCount28 = weightCampaignRows.filter((w) => w.date >= d28 && w.date <= trendEndDate).length
  const measurementDeltasByArea = (() => {
    const out = {}
    const range = measList.filter((m) => m.date >= d28 && m.date <= trendEndDate)
    measNames.forEach((name) => {
      const entries = range.filter((m) => m.name === name).sort((a, b) => new Date(a.date) - new Date(b.date))
      if (entries.length >= 2) {
        out[name] = entries[entries.length - 1].value - entries[0].value
      }
    })
    return out
  })()

  const waistCm = latestByArea['Waist']?.value ?? latestByArea['Belly']?.value ?? null

  const firstLogDateKey = weightCampaignRows.length > 0 ? weightCampaignRows[0].date : null
  const localInsightLines = getLocalInsights({
    currentWeight,
    startWeight,
    goalWeight,
    firstLogDateKey,
    timeZone: dateUtils.timeZone,
    heightCm: personalDetails?.heightCm ?? null,
    age: personalDetails?.age ?? null,
    rateKgPerWeek,
    logCount28: logCount28 > 0 ? logCount28 : null,
    waistCm: waistCm ?? null,
  })

  return (
    <div className="weight-page">
      <h1 className="page-title">Weight &amp; body measurements</h1>
      <p className="page-intro muted">
        Summary and log forms below. Expand to see full campaign tables. Insights (broad) and AI-enabled insights below.
      </p>

      {/* Weight section: summary | log weight */}
      <section className="weight-section card-section">
        <h2 className="section-heading">Weight</h2>
        <div className="summary-row">
          <div className="card summary-card">
            <h3>Summary</h3>
            {currentWeight != null ? (
              <>
                <p className="summary-current"><strong>{currentWeight} kg</strong> <span className="muted">current</span></p>
                <p className="trend-as-of muted small">Trends as of your last log: {trendReferenceDateFormatted}</p>
                <dl className="summary-trends">
                  <dt>7-day</dt>
                  <dd>{weightTrend7 != null ? `${weightTrend7.delta >= 0 ? '+' : ''}${weightTrend7.delta.toFixed(1)} kg` : '—'}</dd>
                  <dt>14-day</dt>
                  <dd>{weightTrend14 != null ? `${weightTrend14.delta >= 0 ? '+' : ''}${weightTrend14.delta.toFixed(1)} kg` : '—'}</dd>
                  <dt>28-day</dt>
                  <dd>{weightTrend28 != null ? `${weightTrend28.delta >= 0 ? '+' : ''}${weightTrend28.delta.toFixed(1)} kg` : '—'}</dd>
                  <dt>3-month</dt>
                  <dd>{weightTrend90 != null ? `${weightTrend90.delta >= 0 ? '+' : ''}${weightTrend90.delta.toFixed(1)} kg` : '—'}</dd>
                </dl>
                <p className="muted small">Trend = change over period from logs in that window (negative = loss).</p>
              </>
            ) : (
              <p className="muted">Log weight to see summary and trends.</p>
            )}
          </div>
          <div className="card">
            <h3>Log weight</h3>
            <form onSubmit={handleAddWeight}>
              <div className="input-group">
                <label>Date</label>
                <input
                  type="date"
                  value={weightLogDate}
                  onChange={(e) => setWeightLogDate(e.target.value)}
                  max={today}
                />
              </div>
              <div className="input-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  placeholder="e.g. 75.2"
                />
              </div>
              <div className="input-group">
                <label>Phase (optional)</label>
                <input
                  type="text"
                  value={weightPhase}
                  onChange={(e) => setWeightPhase(e.target.value)}
                  placeholder="e.g. The Peak, Boxing Day"
                />
              </div>
              <button type="submit" className="btn" disabled={!weightVal}>
                Add weight
              </button>
            </form>
          </div>
        </div>
        <div className="expand-block">
          <button
            type="button"
            className="btn btn-ghost expand-trigger"
            onClick={() => setExpandWeightLog((v) => !v)}
            aria-expanded={expandWeightLog}
          >
            {expandWeightLog ? 'Hide all results' : 'Expand to see all results'}
          </button>
          {expandWeightLog && (
            <div className="card campaign-card expanded-table">
              <h3>Log 1: The Weight &amp; Mass Campaign</h3>
              {weightCampaignRows.length > 0 ? (
                <div className="table-wrap">
                  <table className="campaign-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Phase</th>
                        <th>Weight (kg)</th>
                        <th>Interval Change</th>
                        <th>Total Loss</th>
                        <th>% Body Mass Lost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weightCampaignRows.map((w, i) => {
                        const prev = i > 0 ? weightCampaignRows[i - 1].value : null
                        const intervalChange = prev != null ? w.value - prev : null
                        const totalLoss = referenceWeight != null ? referenceWeight - w.value : null
                        const pctLost = referenceWeight != null && referenceWeight > 0
                          ? ((referenceWeight - w.value) / referenceWeight) * 100
                          : null
                        return (
                          <tr key={w.date + i}>
                            <td>{dateUtils.formatShortDate(w.date)}</td>
                            <td>{w.phase || '—'}</td>
                            <td><strong>{w.value}</strong></td>
                            <td>
                              {intervalChange != null ? `${intervalChange >= 0 ? '+' : ''}${intervalChange.toFixed(1)} kg` : '—'}
                            </td>
                            <td>{totalLoss != null ? `-${totalLoss.toFixed(1)} kg` : '—'}</td>
                            <td>{pctLost != null ? `${pctLost.toFixed(2)}%` : '—'}</td>
                            <td>
                              <button type="button" className="btn btn-ghost small" onClick={() => setEditingWeight({ originalDate: w.date, date: w.date, value: w.value, phase: w.phase || '', note: w.note || '' })}>Edit</button>
                              {' '}
                              <button type="button" className="btn btn-ghost small" onClick={() => { if (window.confirm('Delete this weight entry?')) deleteWeight(w.date); setEditingWeight((prev) => (prev?.date === w.date ? null : prev)); }}>Delete</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Log weight to see the campaign table.</p>
              )}
            </div>
          )}
        </div>

        {editingWeight != null && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-weight-title">
            <div className="modal card">
              <h3 id="edit-weight-title">Edit weight entry</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = parseFloat(editingWeight.value)
                  if (!Number.isFinite(v)) return
                  updateWeight(editingWeight.originalDate, editingWeight.date, v, editingWeight.note, editingWeight.phase)
                  setEditingWeight(null)
                }}
              >
                <div className="input-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editingWeight.date}
                    onChange={(e) => setEditingWeight((prev) => ({ ...prev, date: e.target.value }))}
                    max={today}
                  />
                </div>
                <div className="input-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingWeight.value}
                    onChange={(e) => setEditingWeight((prev) => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>Phase (optional)</label>
                  <input
                    type="text"
                    value={editingWeight.phase}
                    onChange={(e) => setEditingWeight((prev) => ({ ...prev, phase: e.target.value }))}
                    placeholder="e.g. The Peak"
                  />
                </div>
                <div className="input-group">
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    value={editingWeight.note}
                    onChange={(e) => setEditingWeight((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="e.g. morning"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn">Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingWeight(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Measurements section: summary | log measurement */}
      <section className="measurements-section card-section">
        <h2 className="section-heading">Measurements</h2>
        <div className="summary-row">
          <div className="card summary-card">
            <h3>Summary</h3>
            {Object.keys(latestByArea).length > 0 ? (
              <>
                <dl className="summary-measurements">
                  {Object.entries(latestByArea).map(([name, { value }]) => (
                    <React.Fragment key={name}>
                      <dt>{name}</dt>
                      <dd>{value} cm</dd>
                    </React.Fragment>
                  ))}
                </dl>
                {measTrend28 != null && (
                  <p className="summary-trend-note muted small">28-day total change: {measTrend28.delta >= 0 ? '+' : ''}{measTrend28.delta.toFixed(1)} cm</p>
                )}
              </>
            ) : (
              <p className="muted">Log measurements to see summary.</p>
            )}
          </div>
          <div className="card">
            <h3>Log measurement</h3>
            <form onSubmit={handleAddMeasurement}>
              <div className="input-group">
                <label>Date</label>
                <input
                  type="date"
                  value={measLogDate}
                  onChange={(e) => setMeasLogDate(e.target.value)}
                  max={today}
                />
              </div>
              <div className="input-group">
                <label>Measurement</label>
                <select value={measName} onChange={(e) => setMeasName(e.target.value)}>
                  {MEASUREMENT_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Value (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={measVal}
                  onChange={(e) => setMeasVal(e.target.value)}
                  placeholder="e.g. 95"
                />
              </div>
              <button type="submit" className="btn" disabled={!measVal}>
                Add measurement
              </button>
            </form>
          </div>
        </div>
        <div className="expand-block">
          <button
            type="button"
            className="btn btn-ghost expand-trigger"
            onClick={() => setExpandMeasLog((v) => !v)}
            aria-expanded={expandMeasLog}
          >
            {expandMeasLog ? 'Hide all results' : 'Expand to see all results'}
          </button>
          {expandMeasLog && (
            <div className="card campaign-card expanded-table">
              <h3>Log 2: The Volume &amp; Measurement Delta</h3>
              {measNames.length > 0 && measDates.length > 0 ? (
                <div className="table-wrap">
                  <table className="campaign-table measurement-delta">
                    <thead>
                      <tr>
                        <th>Area</th>
                        {measDates.map((d) => (
                          <th key={d}>{dateUtils.formatShortDate(d)}</th>
                        ))}
                        <th>Total CM Change</th>
                        <th>Total % Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measNames.map((name) => {
                        const values = measDates.map((d) => measByKey[`${name}|${d}`])
                        const firstIdx = values.findIndex((v) => v != null)
                        const revIdx = [...values].reverse().findIndex((v) => v != null)
                        const lastIdx = revIdx === -1 ? -1 : values.length - 1 - revIdx
                        const firstVal = firstIdx >= 0 ? values[firstIdx] : null
                        const lastVal = lastIdx >= 0 ? values[lastIdx] : null
                        const totalCm = firstVal != null && lastVal != null ? lastVal - firstVal : null
                        const totalPct = firstVal != null && lastVal != null && firstVal > 0
                          ? ((lastVal - firstVal) / firstVal) * 100
                          : null
                        return (
                          <tr key={name}>
                            <td><strong>{name}</strong></td>
                            {measDates.map((d) => (
                              <td key={d}>{measByKey[`${name}|${d}`] != null ? measByKey[`${name}|${d}`] : '—'}</td>
                            ))}
                            <td>{totalCm != null ? `${totalCm >= 0 ? '+' : ''}${totalCm.toFixed(1)} cm` : '—'}</td>
                            <td>{totalPct != null ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%` : '—'}</td>
                          </tr>
                        )
                      })}
                      {measNames.length > 0 && (
                        <tr className="total-row">
                          <td><strong>TOTAL CM</strong></td>
                          {measDates.map((d) => {
                            const sum = measNames.reduce((s, n) => s + (measByKey[`${n}|${d}`] ?? 0), 0)
                            return <td key={d}>{sum > 0 ? sum.toFixed(1) : '—'}</td>
                          })}
                          <td>
                            {(() => {
                              const sums = measDates.map((d) =>
                                measNames.reduce((s, n) => s + (measByKey[`${n}|${d}`] ?? 0), 0)
                              )
                              const firstTotal = sums.find((v) => v > 0)
                              const lastTotal = sums.filter((v) => v > 0).pop()
                              if (firstTotal != null && lastTotal != null && firstTotal > 0) {
                                const delta = lastTotal - firstTotal
                                return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} cm`
                              }
                              return '—'
                            })()}
                          </td>
                          <td>
                            {(() => {
                              const sums = measDates.map((d) =>
                                measNames.reduce((s, n) => s + (measByKey[`${n}|${d}`] ?? 0), 0)
                              )
                              const firstTotal = sums.find((v) => v > 0)
                              const lastTotal = sums.filter((v) => v > 0).pop()
                              if (firstTotal != null && lastTotal != null && firstTotal > 0) {
                                const pct = ((lastTotal - firstTotal) / firstTotal) * 100
                                return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
                              }
                              return '—'
                            })()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Log measurements to see the volume delta table.</p>
              )}
              {measList.length > 0 && (
                <>
                  <h4 className="table-subheading">All measurement entries</h4>
                  <div className="table-wrap">
                    <table className="campaign-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Area</th>
                          <th>Value (cm)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...measList].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, i) => (
                          <tr key={`${m.date}-${m.name}-${i}`}>
                            <td>{dateUtils.formatShortDate(m.date)}</td>
                            <td>{m.name}</td>
                            <td><strong>{m.value}</strong></td>
                            <td>
                              <button type="button" className="btn btn-ghost small" onClick={() => setEditingMeasurement({ oldDate: m.date, oldName: m.name, date: m.date, name: m.name, value: m.value })}>Edit</button>
                              {' '}
                              <button type="button" className="btn btn-ghost small" onClick={() => { if (window.confirm('Delete this measurement entry?')) deleteMeasurement(m.date, m.name); setEditingMeasurement((prev) => (prev && prev.oldDate === m.date && prev.oldName === m.name ? null : prev)); }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {editingMeasurement != null && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-meas-title">
            <div className="modal card">
              <h3 id="edit-meas-title">Edit measurement entry</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = parseFloat(editingMeasurement.value)
                  if (!Number.isFinite(v)) return
                  updateMeasurement(editingMeasurement.oldDate, editingMeasurement.oldName, editingMeasurement.date, editingMeasurement.name, v, 'cm')
                  setEditingMeasurement(null)
                }}
              >
                <div className="input-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editingMeasurement.date}
                    onChange={(e) => setEditingMeasurement((prev) => ({ ...prev, date: e.target.value }))}
                    max={today}
                  />
                </div>
                <div className="input-group">
                  <label>Area</label>
                  <select
                    value={editingMeasurement.name}
                    onChange={(e) => setEditingMeasurement((prev) => ({ ...prev, name: e.target.value }))}
                  >
                    {MEASUREMENT_NAMES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Value (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingMeasurement.value}
                    onChange={(e) => setEditingMeasurement((prev) => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn">Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingMeasurement(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Insights: broad, local (no API) */}
      <section className="card insights-card">
        <h3>Insights</h3>
        <p className="muted small">
          Summary from your profile, weight log, trends and measurements. No API — always available.
        </p>
        <div className="insights-box local">
          {localInsightLines.map((line, i) => (
            <p key={i} className="insight-line">{line}</p>
          ))}
        </div>
      </section>

      {/* AI-enabled insights: personalised, uses API */}
      <section className="card ai-card">
        <h3>AI-enabled insights</h3>
        <p className="muted small">
          Hyper-analyses your full weight and measurement history with the coach persona for a specific, personalised answer. Requires an API key.
        </p>
        {!aiApiKey && (
          <div className="input-group ai-key-row">
            <input
              type="password"
              value={aiKeyInput}
              onChange={(e) => setAiKeyInput(e.target.value)}
              placeholder="Gemini API key (stored in browser)"
            />
            <button type="button" className="btn" onClick={handleSaveAiKey} disabled={!aiKeyInput.trim()}>
              Save key
            </button>
          </div>
        )}
        {aiApiKey && <p className="small snapshot-green">API key saved.</p>}
        <button
          type="button"
          className="btn"
          onClick={handleFetchInsights}
          disabled={aiLoading || (!aiApiKey && !aiKeyInput)}
        >
          {aiLoading ? 'Generating…' : 'Generate'}
        </button>
        {aiError && <p className="small snapshot-red">{aiError}</p>}
        {aiInsights && (
          <div className="ai-insights-box">
            {aiInsights}
          </div>
        )}
      </section>
      <PageFooter />
    </div>
  )
}
