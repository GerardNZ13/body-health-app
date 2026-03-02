/**
 * Work level calculator for the Exercise page.
 * Combines today's steps (vs goal) and whether a workout was done to decide:
 * - Rest & recover when steps are met and exercise is done.
 * - Recommend a workout when steps aren't met or nothing else is done.
 * - Scale suggestion intensity by work level (e.g. high work level → lower-range suggestions).
 * Also factors in recent days (last 7): if steps/workouts have been high for several days,
 * recommends "hit minimums and rest" so the user doesn't overdo it.
 */

/** Get YYYY-MM-DD for n days before dateKey (dateKey is YYYY-MM-DD). */
function getDateKeyDaysAgo(dateKey, days) {
  if (!dateKey || days <= 0) return dateKey
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

/** Last 7 day keys including today (today first). */
function getLast7DayKeys(todayKey) {
  if (!todayKey) return []
  const keys = []
  for (let i = 0; i < 7; i++) keys.push(i === 0 ? todayKey : getDateKeyDaysAgo(todayKey, i))
  return keys
}

/** Last N day keys including today (today first). */
function getLastNDayKeys(todayKey, n) {
  if (!todayKey || n <= 0) return []
  const keys = []
  for (let i = 0; i < n; i++) keys.push(i === 0 ? todayKey : getDateKeyDaysAgo(todayKey, i))
  return keys
}

/** True if log is a designated rest day (no workout, intentional rest). */
function isRestDay(log) {
  return log && log.workoutType === 'Rest'
}

/**
 * Check if a single day's log meets steps + all ring goals (baseline success).
 */
function dayAllRingsMet(log, stepsGoal, activityKcalGoal, workoutMinsGoal, movementHoursGoal) {
  if (!log) return false
  const stepsOk = stepsGoal != null && stepsGoal > 0 ? (log.steps != null && log.steps >= stepsGoal) : true
  const activityOk = activityKcalGoal == null || activityKcalGoal <= 0
    ? true
    : (log.activityKcal != null && log.activityKcal >= activityKcalGoal)
  const workoutOk = workoutMinsGoal == null || workoutMinsGoal <= 0
    ? true
    : (log.workoutMins != null && log.workoutMins >= workoutMinsGoal)
  const movementOk = movementHoursGoal == null || movementHoursGoal <= 0
    ? true
    : (log.movementHours != null && log.movementHours >= movementHoursGoal)
  return stepsOk && activityOk && workoutOk && movementOk
}

/**
 * Summarise recent load from logs. Includes steps + rings baseline (all rings met).
 * @param {Array<{ date: string, steps?: number, activityKcal?: number, workoutMins?: number, movementHours?: number, workoutType?: string }>} recentLogs
 * @param {string} todayKey - YYYY-MM-DD
 * @param {number} stepsGoal
 * @param {{ activityKcalDaily?: number, workoutMinsDaily?: number, movementHoursDaily?: number }} ringGoals - Optional ring goals; if missing, rings are not required for "all met".
 * @returns {{ stepsMetCount: number, workoutCount: number, allRingsMetCount: number }}
 */
function getRecentLoad(recentLogs, todayKey, stepsGoal, ringGoals = {}) {
  const dayKeys = getLast7DayKeys(todayKey)
  const byDate = new Map()
  for (const log of recentLogs || []) {
    if (!log.date) continue
    byDate.set(log.date, log)
  }
  const activityGoal = ringGoals.activityKcalDaily
  const workoutMinsGoal = ringGoals.workoutMinsDaily
  const movementGoal = ringGoals.movementHoursDaily

  let stepsMetCount = 0
  let workoutCount = 0
  let allRingsMetCount = 0
  for (const key of dayKeys) {
    const log = byDate.get(key)
    if (log && log.steps != null && log.steps >= stepsGoal) stepsMetCount++
    if (log && log.workoutType && !isRestDay(log)) workoutCount++
    if (dayAllRingsMet(log, stepsGoal, activityGoal, workoutMinsGoal, movementGoal)) allRingsMetCount++
  }
  return { stepsMetCount, workoutCount, allRingsMetCount }
}

/**
 * Trend: sustained = high training load (lots of workouts); moderate = some; fresh = little.
 * We do NOT use "all rings met" alone for SUSTAINED—hitting baseline (steps + rings) every day
 * is good consistency and should not by itself force "hit minimums and rest". Only when you've
 * been both consistent and doing plenty of workouts do we suggest prioritising rest.
 */
const TREND = { SUSTAINED: 'sustained', MODERATE: 'moderate', FRESH: 'fresh' }

function getTrend(stepsMetInLast7, workoutsInLast7, allRingsMetInLast7) {
  // High workout frequency → sustained (prioritise rest)
  if (workoutsInLast7 >= 5) return TREND.SUSTAINED
  // Many steps-met days + solid workouts → sustained
  if (stepsMetInLast7 >= 6 && workoutsInLast7 >= 3) return TREND.SUSTAINED
  // Baseline hit most days AND 4+ workouts → sustained (consistent + training a lot)
  if (allRingsMetInLast7 >= 5 && workoutsInLast7 >= 4) return TREND.SUSTAINED
  // Moderate: decent week but not in "rest" territory
  if (workoutsInLast7 >= 4 || stepsMetInLast7 >= 5 || allRingsMetInLast7 >= 4) return TREND.MODERATE
  return TREND.FRESH
}

/**
 * @param {number} todaySteps - Steps logged today (or 0)
 * @param {number} stepsGoal - Daily steps goal (e.g. 6000)
 * @param {boolean} workoutDoneToday - True if a workout was logged for today
 * @param {{ recentLogs?: Array<{ date: string, steps?: number, activityKcal?: number, workoutMins?: number, movementHours?: number, workoutType?: string }>, todayKey?: string, ringGoals?: { activityKcalDaily?: number, workoutMinsDaily?: number, movementHoursDaily?: number }, todayRings?: { activityKcal?: number, workoutMins?: number, movementHours?: number } }} options - Optional. recentLogs + todayKey + ringGoals + todayRings for rings-aware baseline success.
 * @returns {{ level: 'rest'|'low'|'medium'|'high', recommendation: 'rest'|'suggest', label: string, description: string, trend: 'sustained'|'moderate'|'fresh' }}
 */
export function getWorkLevel(todaySteps, stepsGoal, workoutDoneToday, options = {}) {
  const { recentLogs = [], todayKey = null, ringGoals = {}, todayRings = {} } = options
  const goal = stepsGoal && stepsGoal > 0 ? stepsGoal : 6000
  const stepsMet = todaySteps >= goal
  const stepsPct = goal ? Math.min(1, todaySteps / goal) : 0
  const stepsJustMetOrOver = stepsPct >= 0.8

  const activityGoal = ringGoals.activityKcalDaily
  const workoutMinsGoal = ringGoals.workoutMinsDaily
  const movementGoal = ringGoals.movementHoursDaily
  const todayAllRingsMet = dayAllRingsMet(
    { steps: todaySteps, ...todayRings },
    goal,
    activityGoal,
    workoutMinsGoal,
    movementGoal
  )

  const { stepsMetCount: stepsMetInLast7, workoutCount: workoutsInLast7, allRingsMetCount: allRingsMetInLast7 } = getRecentLoad(recentLogs, todayKey, goal, ringGoals)
  const trend = todayKey ? getTrend(stepsMetInLast7, workoutsInLast7, allRingsMetInLast7) : TREND.FRESH

  const sustainedMessage = "You've done a lot in the last 7 days—prioritise hitting minimums and rest. We'll suggest a lighter range if you still want to move."

  if ((stepsMet && workoutDoneToday) || (todayAllRingsMet && workoutDoneToday)) {
    return {
      level: 'rest',
      recommendation: 'rest',
      label: 'Rest & recover',
      description: trend === TREND.SUSTAINED
        ? "You've hit steps and rings and trained today, and you've been consistent this week. Best option: rest and recover."
        : "You've hit your steps (and rings) and done a workout today. Best option: rest and recover.",
      trend,
    }
  }

  if (trend === TREND.SUSTAINED && !workoutDoneToday) {
    return {
      level: 'high',
      recommendation: 'suggest',
      label: 'Hit minimums and rest',
      description: sustainedMessage,
      trend,
    }
  }

  if (!workoutDoneToday) {
    if (!stepsJustMetOrOver) {
      return {
        level: 'low',
        recommendation: 'suggest',
        label: 'Suggested workout',
        description: trend === TREND.MODERATE
          ? "Steps aren't met yet and no workout logged. You've had a solid week—a session fits, or keep it light if you prefer."
          : "Steps aren't met yet and no workout logged. A session would fit well—suggestions below are at full range.",
        trend,
      }
    }
    if (stepsMet) {
      return {
        level: 'high',
        recommendation: 'suggest',
        label: 'Light option',
        description: "You've already hit your steps. If you still want to move, we'll suggest a lighter range (e.g. fewer exercises, lower intensity).",
        trend,
      }
    }
    return {
      level: 'medium',
      recommendation: 'suggest',
      label: 'Suggested workout',
      description: "Steps are close to goal. You can do a full session or we can suggest a slightly scaled-down range if you prefer.",
      trend,
    }
  }

  return {
    level: 'medium',
    recommendation: 'suggest',
    label: 'Suggested workout',
    description: "You've done a workout today; steps are under goal. Rest is fine, or add steps when you can.",
    trend,
  }
}

/**
 * Scale factor for workout library: how much to reduce exercise counts / intensity.
 * - 'none': full range (low work level)
 * - 'light': reduced (medium/high work level, or sustained trend)
 * - 'minimal': rest day but they asked for something (mobility/stretch only or 1–2 exercises)
 *
 * @param {string} level - 'rest' | 'low' | 'medium' | 'high'
 * @param {string} recommendation - 'rest' | 'suggest'
 * @param {string} [trend] - 'sustained' | 'moderate' | 'fresh'. When 'sustained', scale down more.
 * @returns {'none'|'light'|'minimal'}
 */
export function getWorkLevelScale(level, recommendation, trend) {
  if (recommendation === 'rest') return 'minimal'
  if (trend === 'sustained') return 'light'
  if (level === 'high') return 'light'
  if (level === 'medium') return 'light'
  return 'none'
}

/** Number of days we look back for "full rest" suggestion (baseline met a lot, few rest days). */
const FULL_REST_LOOKBACK_DAYS = 14
/** Minimum days baseline met in that window to suggest a full rest. */
const FULL_REST_BASELINE_THRESHOLD = 10
/** If they've already had this many rest days in the window, don't suggest another. */
const FULL_REST_MAX_REST_DAYS = 2

/**
 * Suggests a full rest day (don't even hit minimums) when the user has been hitting baseline
 * most days for the last 2 weeks with little or no designated rest.
 * @param {Array<{ date: string, steps?: number, activityKcal?: number, workoutMins?: number, movementHours?: number, workoutType?: string }>} recentLogs
 * @param {string} todayKey - YYYY-MM-DD
 * @param {number} stepsGoal
 * @param {{ activityKcalDaily?: number, workoutMinsDaily?: number, movementHoursDaily?: number }} ringGoals
 * @returns {{ suggest: boolean, reason?: string }}
 */
export function getSuggestFullRestDay(recentLogs, todayKey, stepsGoal, ringGoals = {}) {
  if (!todayKey || !recentLogs?.length) return { suggest: false }
  const byDate = new Map()
  for (const log of recentLogs) {
    if (!log.date) continue
    byDate.set(log.date, log)
  }
  const todayLog = byDate.get(todayKey)
  if (isRestDay(todayLog)) return { suggest: false }

  const activityGoal = ringGoals.activityKcalDaily
  const workoutMinsGoal = ringGoals.workoutMinsDaily
  const movementGoal = ringGoals.movementHoursDaily
  const dayKeys = getLastNDayKeys(todayKey, FULL_REST_LOOKBACK_DAYS)

  let baselineMetCount = 0
  let restDayCount = 0
  for (const key of dayKeys) {
    const log = byDate.get(key)
    if (dayAllRingsMet(log, stepsGoal, activityGoal, workoutMinsGoal, movementGoal)) baselineMetCount++
    if (isRestDay(log)) restDayCount++
  }

  if (restDayCount >= FULL_REST_MAX_REST_DAYS) return { suggest: false }
  if (baselineMetCount < FULL_REST_BASELINE_THRESHOLD) return { suggest: false }

  return {
    suggest: true,
    reason: "You've hit your baseline most days for the last 2 weeks with little rest. We really suggest a full rest day today—don't even worry about minimums. Your body will thank you.",
  }
}
