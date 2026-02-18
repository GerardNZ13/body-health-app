/**
 * Holistic insight from weight, nutrition, and exercise data.
 * Friendly coach / teacher / "dad" vibe: "I see you and the work you're doing."
 * Never preachy; when effort's off, still kind — "that happens, small steps when you're ready."
 * Each insight has a label and timeframe so the user knows what "it" refers to.
 */

import { rateInterpretation } from './personalStats'

/**
 * @typedef {{ id: string, label: string, timeframe: string, message: string }} InsightItem
 */

/**
 * Build insight items with clear context (label + timeframe) so each line makes sense on its own.
 * @param {Object} opts - same as before
 * @returns {{ items: InsightItem[], hasData: boolean }}
 */
export function getHolisticInsight(opts) {
  const {
    currentWeight = null,
    weightRateKgPerWeek = null,
    goalWeightKg = null,
    dailySnapshot = 'orange',
    weeklySnapshot = 'orange',
    actualExerciseLevel = null,
    goalExerciseLevel = null,
    todaySteps = 0,
    stepsGoal = 6000,
    gentleNudges = [],
    hasAnyNutritionData = true,
    hydrationInsight = null,
  } = opts

  const items = []
  let hasData = false

  // —— Weight (trend = sliding window from first to last logged weigh-in) ——
  if (currentWeight != null && weightRateKgPerWeek != null) {
    hasData = true
    const interpretation = rateInterpretation(weightRateKgPerWeek)
    if (interpretation) {
      items.push({
        id: 'weight-trend',
        label: 'Weight trend',
        timeframe: 'From your last weigh-ins (sliding)',
        message: interpretation,
      })
    }
    if (goalWeightKg != null && currentWeight > goalWeightKg && weightRateKgPerWeek < 0) {
      items.push({
        id: 'weight-goal',
        label: 'Weight goal',
        timeframe: 'Where you\'re heading',
        message: "You're moving toward your goal — keep doing what you're doing.",
      })
    } else if (goalWeightKg != null && currentWeight <= goalWeightKg) {
      items.push({
        id: 'weight-goal',
        label: 'Weight goal',
        timeframe: 'Current',
        message: "You're at or below your goal weight. Nice.",
      })
    }
  } else if (currentWeight != null) {
    hasData = true
    items.push({
      id: 'weight-trend',
      label: 'Weight trend',
      timeframe: 'Need more data',
      message: "Weight's logged; add another entry in a few days to see your trend.",
    })
  }

  // —— Nutrition (today = single day, weekly = last 7 days average) ——
  if (hasAnyNutritionData) {
    const timeframe = 'Today vs last 7 days'
    if (dailySnapshot === 'green' && weeklySnapshot === 'green') {
      hasData = true
      items.push({
        id: 'nutrition',
        label: 'Nutrition',
        timeframe,
        message: "In a good place today and this week. I see the work.",
      })
    } else if (dailySnapshot === 'green' || weeklySnapshot === 'green') {
      hasData = true
      items.push({
        id: 'nutrition',
        label: 'Nutrition',
        timeframe,
        message: "Mostly on track. A small tweak when you feel like it can nudge it further.",
      })
    } else if (dailySnapshot === 'red' && weeklySnapshot === 'red') {
      hasData = true
      items.push({
        id: 'nutrition',
        label: 'Nutrition',
        timeframe,
        message: "This week's been a bit off plan — that happens. When you're ready, a few small steps get you back in the groove.",
      })
    } else if (dailySnapshot !== 'orange' || weeklySnapshot !== 'orange') {
      hasData = true
      items.push({
        id: 'nutrition',
        label: 'Nutrition',
        timeframe,
        message: "Could use a little attention. No rush — you've got this.",
      })
    }
  }

  // —— Movement (today's steps + workouts from last ~2 weeks) ——
  const stepsOk = stepsGoal > 0 && todaySteps >= stepsGoal
  const levelMatch = actualExerciseLevel && goalExerciseLevel && actualExerciseLevel === goalExerciseLevel
  const levelAhead = actualExerciseLevel && goalExerciseLevel &&
    ['Bronze', 'Gold', 'Platinum'].indexOf(actualExerciseLevel) >= ['Bronze', 'Gold', 'Platinum'].indexOf(goalExerciseLevel)

  const movementTimeframe = 'Today\'s steps + workouts lately (last 2 weeks)'
  if (stepsOk || levelMatch || levelAhead) {
    hasData = true
    items.push({
      id: 'movement',
      label: 'Movement',
      timeframe: movementTimeframe,
      message: "You're at the level you're aiming for — that counts.",
    })
  } else if (actualExerciseLevel || stepsGoal > 0) {
    hasData = true
    items.push({
      id: 'movement',
      label: 'Movement',
      timeframe: movementTimeframe,
      message: "Been a bit light lately. Whenever you're ready, a short walk or one session helps.",
    })
  }

  // —— Today-only soft nudges (sodium, sugar, etc.) ——
  if (gentleNudges.length > 0 && items.length > 0) {
    const nudge = gentleNudges[0]
    if (nudge?.message) {
      items.push({
        id: nudge.id || 'nudge',
        label: 'A quick note (today)',
        timeframe: 'Today\'s log only',
        message: nudge.message,
      })
    }
  }

  // —— Hydration (not logging / consistent / uh-oh refill + walk) ——
  if (hydrationInsight?.message) {
    hasData = true
    items.push({
      id: hydrationInsight.id || 'hydration',
      label: hydrationInsight.label || 'Hydration',
      timeframe: hydrationInsight.timeframe || 'Lately',
      message: hydrationInsight.message,
    })
  }

  return {
    items: items.slice(0, 6),
    hasData,
  }
}
