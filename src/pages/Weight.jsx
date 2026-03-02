import React, { useState } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { getDateKeyOffset, addDaysToDateKey, formatLongMonth } from '../utils/date'
import { bmi, bmiCategory, rateInterpretation, weightAtBmi, BMI_BANDS } from '../utils/personalStats'
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

/** Pick ~n nice tick values between min and max (for axis labels). */
function niceTicks(min, max, n = 5) {
  if (min === max) return [min]
  const range = max - min
  const step = range / (n - 1)
  const ticks = []
  for (let i = 0; i < n; i++) ticks.push(min + step * i)
  return ticks
}

/** ViewBox size for trend charts — fixed so SVG scales to fill container. */
const CHART_VIEWBOX = { width: 500, height: 220 }

/** Simple SVG line chart: weight (kg) over time with axes. Extends 3 months ahead with trend line. Optional BMI overlay. Hover for date + weight. */
function WeightTrendChart({ rows, formatShortDate, heightCm }) {
  const [hovered, setHovered] = useState(null)
  const sorted = [...(rows || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length < 2) {
    return <p className="muted small">Add at least two weight entries to see the trend graph.</p>
  }
  const { width, height } = CHART_VIEWBOX
  const padding = { top: 16, right: 16, bottom: 40, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const firstDate = sorted[0].date
  const lastDate = sorted[sorted.length - 1].date
  const lastValue = sorted[sorted.length - 1].value
  const firstValue = sorted[0].value
  const minX = new Date(firstDate).getTime()
  // Extend x-axis 3 months (≈90 days) beyond last data point
  const futureDateKey = addDaysToDateKey(lastDate, 90)
  const maxXExtended = new Date(futureDateKey).getTime()
  const maxX = maxXExtended

  // Trend: use last 14-day or 7-day rate to extrapolate to +3 mo (prefer 14-day if enough points)
  const last14Start = getDateKeyOffset(lastDate, 14)
  const last7Start = getDateKeyOffset(lastDate, 7)
  const in14 = sorted.filter((r) => r.date >= last14Start && r.date <= lastDate)
  const in7 = sorted.filter((r) => r.date >= last7Start && r.date <= lastDate)
  let rateKgPerWeek = 0
  let trendSource = 'all'
  if (in14.length >= 2) {
    const first = in14[0]
    const last = in14[in14.length - 1]
    const days = (new Date(last.date) - new Date(first.date)) / (24 * 60 * 60 * 1000)
    if (days > 0) {
      rateKgPerWeek = (last.value - first.value) / (days / 7)
      trendSource = '14d'
    }
  }
  if (trendSource !== '14d' && in7.length >= 2) {
    const first = in7[0]
    const last = in7[in7.length - 1]
    const days = (new Date(last.date) - new Date(first.date)) / (24 * 60 * 60 * 1000)
    if (days > 0) {
      rateKgPerWeek = (last.value - first.value) / (days / 7)
      trendSource = '7d'
    }
  }
  if (trendSource !== '14d' && trendSource !== '7d') {
    const daysBetween = (new Date(lastDate) - new Date(firstDate)) / (24 * 60 * 60 * 1000)
    rateKgPerWeek = daysBetween > 0 ? (lastValue - firstValue) / (daysBetween / 7) : 0
  }
  const projectedWeight = lastValue + rateKgPerWeek * (90 / 7)

  let minY = Math.min(...sorted.map((r) => r.value))
  let maxY = Math.max(...sorted.map((r) => r.value))
  minY = Math.min(minY, projectedWeight)
  maxY = Math.max(maxY, projectedWeight)

  // If we have height, add BMI band boundaries to y range so bands are visible
  const bmiBoundaryWeights = heightCm != null && heightCm > 0
    ? [18.5, 25, 30, 35, 40].map((b) => weightAtBmi(b, heightCm)).filter((w) => w != null)
    : []
  if (bmiBoundaryWeights.length > 0) {
    const pad = 3
    minY = Math.min(minY, ...bmiBoundaryWeights) - pad
    maxY = Math.max(maxY, ...bmiBoundaryWeights) + pad
  }
  const rangeY = maxY - minY || 1
  const x = (d) => padding.left + (innerW * (new Date(d.date).getTime() - minX)) / (maxX - minX || 1)
  const y = (v) => padding.top + innerH - (innerH * (v - minY)) / rangeY
  const pathD = sorted.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r)} ${y(r.value)}`).join(' ')
  // Trend line: last data point → +3 mo (extrapolated from 7d/14d or full range)
  const xLast = x({ date: lastDate })
  const xFuture = x({ date: futureDateKey })
  const trendLineD = `M ${xLast} ${y(lastValue)} L ${xFuture} ${y(projectedWeight)}`

  const yTicks = niceTicks(minY, maxY, 5)
  const formatDate = formatShortDate || ((key) => key.slice(5))
  // X ticks: 2-weekly; only one label at the end — "+3 mo" (no last 2-week date before it)
  const formatDDMM = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`
  const xTickDates = []
  let d = firstDate
  const futureTime = new Date(futureDateKey).getTime()
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000
  while (new Date(d).getTime() + twoWeeksMs < futureTime) {
    xTickDates.push(d)
    d = addDaysToDateKey(d, 14)
  }
  xTickDates.push(futureDateKey)

  // BMI bands (weight ranges) for overlay — only when height is set
  const bmiBands =
    heightCm != null && heightCm > 0
      ? BMI_BANDS.map((band, i) => {
          const wLow = i === 0 ? minY : weightAtBmi(BMI_BANDS[i - 1].bmiMax, heightCm)
          const wHigh = band.bmiMax != null ? weightAtBmi(band.bmiMax, heightCm) : maxY + 20
          return { ...band, wLow, wHigh }
        })
      : []

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* BMI band overlay (behind grid and line); clamp to visible y range */}
        {bmiBands.map((band) => {
          const wLow = Math.max(band.wLow, minY)
          const wHigh = Math.min(band.wHigh, maxY)
          if (wLow >= wHigh) return null
          return (
            <rect
              key={band.label}
              x={padding.left}
              y={y(wHigh)}
              width={innerW}
              height={Math.max(0, y(wLow) - y(wHigh))}
              fill={band.color}
            />
          )
        })}
        {/* Y-axis (left) */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} className="trend-chart-axis" />
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padding.left} y1={y(v)} x2={padding.left + innerW} y2={y(v)} className="trend-chart-grid" />
            <text x={padding.left - 6} y={y(v)} className="trend-chart-tick" textAnchor="end" dominantBaseline="middle">{v.toFixed(1)}</text>
          </g>
        ))}
        {/* X-axis (bottom) */}
        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} className="trend-chart-axis" />
        {xTickDates.map((dateKey) => (
          <text key={dateKey} x={x({ date: dateKey })} y={padding.top + innerH + 20} className="trend-chart-tick" textAnchor="middle">
            {dateKey === futureDateKey ? '+3 mo' : formatDDMM(dateKey)}
          </text>
        ))}
        {/* Actual data line */}
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Trend line: first point → +3 mo (1.5px, pointer-events: none so hover works) */}
        <path
          d={trendLineD}
          fill="none"
          stroke="#c2410c"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeLinecap="round"
          pointerEvents="none"
        />
        <circle cx={xFuture} cy={y(projectedWeight)} r={3} fill="#c2410c" pointerEvents="none" />
        <text x={xFuture} y={y(projectedWeight) - 12} className="trend-chart-projection-label" textAnchor="middle" fill="#c2410c">
          ~{projectedWeight.toFixed(1)} kg
        </text>
        {/* Invisible hit targets + hover pin and tooltip (always above, in box) */}
        {sorted.map((r) => {
          const px = x(r)
          const py = y(r.value)
          const isHovered = hovered && hovered.date === r.date
          const tooltipY = Math.max(padding.top - 2, py - 30)
          const textY = tooltipY + 14
          return (
            <g
              key={r.date}
              onMouseEnter={() => setHovered({ date: r.date, value: r.value, x: px, y: py })}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={px} cy={py} r={12} fill="transparent" />
              {isHovered && (
                <>
                  <circle cx={px} cy={py} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
                  <rect
                    x={px - 48}
                    y={tooltipY}
                    width={96}
                    height={24}
                    rx={4}
                    className="trend-chart-tooltip-box"
                  />
                  <text x={px} y={textY} className="trend-chart-tooltip-text" textAnchor="middle">
                    {formatDate(r.date)}: {r.value} kg
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
      <p className="trend-chart-trend-caption muted small">
        Trend from {trendSource === '14d' ? 'last 14 days' : trendSource === '7d' ? 'last 7 days' : 'full range'}: ~{projectedWeight.toFixed(1)} kg in 3 months (projection, not a forecast).
      </p>
      {bmiBands.length > 0 && (
        <>
          <ul className="trend-chart-legend trend-chart-bmi-legend" aria-label="BMI classification bands">
            {BMI_BANDS.map((b) => (
              <li key={b.label} style={{ borderLeftColor: b.color.replace('0.2)', '1)').replace('0.25)', '1)') }}>
                {b.label}
              </li>
            ))}
          </ul>
          <p className="trend-chart-bmi-caveat muted small">BMI is a population guide; athletes and very muscular builds can sit in &quot;overweight&quot; while healthy.</p>
        </>
      )}
      <p className="trend-chart-axis-label trend-chart-y-label">Weight (kg)</p>
    </div>
  )
}

/** Simple SVG multi-line chart: measurement areas (cm) over time with axes. Optional ref lines (88/102 cm, ½ height if heightCm). */
const MEAS_CHART_COLORS = ['var(--accent)', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']

/** Waist-related reference lines for measurement chart (cm). 88/102 = common metabolic risk thresholds; ½ height from height. */
const MEAS_REF_LINES = [
  { value: 88, label: '88 cm (waist ref)', stroke: 'rgba(234, 179, 8, 0.8)' },
  { value: 102, label: '102 cm (waist ref)', stroke: 'rgba(239, 68, 68, 0.8)' },
]

function MeasurementTrendChart({ measList, formatShortDate, heightCm }) {
  const list = Array.isArray(measList) ? measList : []
  const byName = {}
  list.forEach((m) => {
    if (!byName[m.name]) byName[m.name] = []
    byName[m.name].push({ date: m.date, value: m.value })
  })
  const names = Object.keys(byName).sort()
  names.forEach((name) => {
    byName[name].sort((a, b) => new Date(a.date) - new Date(b.date))
  })
  const allPoints = list.length ? list : []
  if (allPoints.length < 2 || names.length === 0) {
    return <p className="muted small">Add at least two measurement entries to see the trend graph.</p>
  }
  const { width, height } = CHART_VIEWBOX
  const dates = [...new Set(allPoints.map((m) => m.date))].sort((a, b) => new Date(a) - new Date(b))
  const minX = new Date(dates[0]).getTime()
  const maxX = new Date(dates[dates.length - 1]).getTime()
  let minY = Math.min(...allPoints.map((m) => m.value))
  let maxY = Math.max(...allPoints.map((m) => m.value))

  // Reference lines: 88, 102 cm; and ½ height (waist-to-height) if height set
  const refLines = [...MEAS_REF_LINES]
  if (heightCm != null && heightCm > 0) {
    const halfHeight = Math.round(heightCm / 2)
    refLines.push({ value: halfHeight, label: `½ height (${halfHeight} cm)`, stroke: 'rgba(34, 197, 94, 0.7)' })
  }
  const refValues = refLines.map((r) => r.value)
  const pad = 2
  minY = Math.min(minY, ...refValues) - pad
  maxY = Math.max(maxY, ...refValues) + pad

  const rangeY = maxY - minY || 1
  const padding = { top: 16, right: 16, bottom: 40, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const x = (dateKey) => padding.left + (innerW * (new Date(dateKey).getTime() - minX)) / (maxX - minX || 1)
  const y = (v) => padding.top + innerH - (innerH * (v - minY)) / rangeY

  const yTicks = niceTicks(minY, maxY, 5)
  const xTickCount = Math.min(6, dates.length)
  const xTickDates = xTickCount <= 1 ? [dates[0]] : Array.from({ length: xTickCount }, (_, i) => dates[Math.round((i / (xTickCount - 1)) * (dates.length - 1))])
  const formatDate = formatShortDate || ((key) => key.slice(5))

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* Reference lines (waist / ½ height); labels staggered across chart so they don’t overlap */}
        {refLines.map((ref, refIdx) => {
          const labelX = padding.left + innerW * (0.35 + (refIdx / Math.max(1, refLines.length - 1)) * 0.6)
          return (
            <g key={ref.label}>
              <line
                x1={padding.left}
                y1={y(ref.value)}
                x2={padding.left + innerW}
                y2={y(ref.value)}
                stroke={ref.stroke}
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <text x={labelX} y={y(ref.value)} className="trend-chart-ref-label" textAnchor="middle" dominantBaseline="middle">
                {ref.label}
              </text>
            </g>
          )
        })}
        {/* Y-axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} className="trend-chart-axis" />
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padding.left} y1={y(v)} x2={padding.left + innerW} y2={y(v)} className="trend-chart-grid" />
            <text x={padding.left - 6} y={y(v)} className="trend-chart-tick" textAnchor="end" dominantBaseline="middle">{v.toFixed(0)}</text>
          </g>
        ))}
        {/* X-axis */}
        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} className="trend-chart-axis" />
        {xTickDates.map((d) => (
          <text key={d} x={x(d)} y={padding.top + innerH + 20} className="trend-chart-tick" textAnchor="middle">{formatDate(d)}</text>
        ))}
        {names.map((name, idx) => {
          const points = byName[name]
          if (points.length < 2) return null
          const pathD = points.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.date)} ${y(r.value)}`).join(' ')
          const color = MEAS_CHART_COLORS[idx % MEAS_CHART_COLORS.length]
          return <path key={name} d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        })}
      </svg>
      <p className="trend-chart-axis-label trend-chart-y-label">Measurements (cm)</p>
      <ul className="trend-chart-legend">
        {names.map((name, idx) => (
          <li key={name} style={{ color: MEAS_CHART_COLORS[idx % MEAS_CHART_COLORS.length] }}>{name}</li>
        ))}
      </ul>
      {refLines.length > 0 && (
        <p className="trend-chart-ref-note muted small">Reference: 88/102 cm = common waist risk thresholds; ½ height = waist-to-height guideline.</p>
      )}
    </div>
  )
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
  const [showWeightGraph, setShowWeightGraph] = useState(false)
  const [showMeasGraph, setShowMeasGraph] = useState(false)
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
            <div className="card campaign-card expanded-table campaign-flip">
              <div className="campaign-flip-inner">
                {!showWeightGraph && (
                  <>
                    <div className="campaign-flip-header">
                      <h3>Log 1: The Weight &amp; Mass Campaign</h3>
                      {weightCampaignRows.length >= 2 && (
                        <p className="pivot-trigger muted small">
                          <button type="button" className="btn-link" onClick={() => setShowWeightGraph(true)}>
                            View trend graph
                          </button>
                        </p>
                      )}
                    </div>
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
                  </>
                )}
                {showWeightGraph && (
                  <div className="campaign-graph-panel">
                    <button type="button" className="btn btn-ghost btn-back" onClick={() => setShowWeightGraph(false)}>
                      ← Back to table
                    </button>
                    <h3>Weight trend</h3>
                    <WeightTrendChart rows={weightCampaignRows} formatShortDate={dateUtils.formatShortDate} heightCm={personalDetails?.heightCm ?? null} />
                  </div>
                )}
              </div>
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
            <div className="card campaign-card expanded-table campaign-flip">
              <div className="campaign-flip-inner">
                {!showMeasGraph && (
                  <>
                    <div className="campaign-flip-header">
                      <h3>Log 2: The Volume &amp; Measurement Delta</h3>
                      {measList.length >= 2 && (
                        <p className="pivot-trigger muted small">
                          <button type="button" className="btn-link" onClick={() => setShowMeasGraph(true)}>
                            View trend graph
                          </button>
                        </p>
                      )}
                    </div>
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
                  </>
                )}
                {showMeasGraph && (
                  <div className="campaign-graph-panel">
                    <button type="button" className="btn btn-ghost btn-back" onClick={() => setShowMeasGraph(false)}>
                      ← Back to table
                    </button>
                    <h3>Measurements trend</h3>
                    <MeasurementTrendChart measList={measList} formatShortDate={dateUtils.formatShortDate} heightCm={personalDetails?.heightCm ?? null} />
                  </div>
                )}
              </div>
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
