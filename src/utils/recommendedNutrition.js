/**
 * Recommended daily nutrition range based on personal details, current weight,
 * desired rate of weight loss (by goal tier), and optional diet pattern from logs.
 * Used on Personal page ("based on your details...") and Nutrition page for traffic light and totals.
 */

/**
 * Mifflin–St Jeor BMR (kcal/day). Weight kg, height cm, age years.
 */
function mifflinStJeor(weightKg, heightCm, age) {
  if (weightKg == null || heightCm == null || weightKg <= 0 || heightCm <= 0) return null
  const ageTerm = age != null && age > 0 ? 5 * age : 0
  return 10 * weightKg + 6.25 * heightCm - ageTerm - 161
}

/** Desired weight loss rate by goal tier (kg per week): Bronze 0–0.5, Gold 0.5–1, Platinum 1+ */
export const LOSS_RATE_KG_PER_WEEK = { Bronze: 0.25, Gold: 0.75, Platinum: 1 }

/** ~7700 kcal per kg body fat; daily deficit = rate_kg_per_week * 7700 / 7. Cap for safety. */
const KCAL_PER_KG_FAT = 7700
const MAX_DAILY_DEFICIT = 1000

function deficitFromRate(rateKgPerWeek) {
  const daily = (rateKgPerWeek * KCAL_PER_KG_FAT) / 7
  return Math.min(Math.round(daily), MAX_DAILY_DEFICIT)
}

/**
 * From recent exercise logs, return the most common tier (Bronze/Gold/Platinum).
 * Used to compare "goal level" vs "lately you've been at X".
 * @param {Array<{ tier?: string, exercisesDone?: Array<{tier}> }>} exerciseLogs
 * @param {number} lastN - use last N logs that have a tier
 * @returns {string|null} 'Bronze'|'Gold'|'Platinum' or null
 */
export function getActualExerciseLevel(exerciseLogs, lastN = 15) {
  if (!Array.isArray(exerciseLogs)) return null
  const withTier = exerciseLogs
    .filter((l) => l.workoutType && (l.tier || (l.exercisesDone && l.exercisesDone.length)))
    .map((l) => {
      if (l.tier) return l.tier
      const tiers = (l.exercisesDone || []).map((d) => (d.tier || '').trim()).filter(Boolean)
      if (tiers.some((t) => /platinum/i.test(t))) return 'Platinum'
      if (tiers.some((t) => /gold/i.test(t))) return 'Gold'
      if (tiers.some((t) => /bronze/i.test(t))) return 'Bronze'
      return null
    })
    .filter(Boolean)
  const recent = withTier.slice(-lastN)
  if (recent.length < 2) return null
  const counts = { Bronze: 0, Gold: 0, Platinum: 0 }
  recent.forEach((t) => {
    const k = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    if (k in counts) counts[k]++
  })
  const max = Math.max(counts.Bronze, counts.Gold, counts.Platinum)
  if (max === 0) return null
  if (counts.Platinum === max) return 'Platinum'
  if (counts.Gold === max) return 'Gold'
  return 'Bronze'
}

/**
 * Infer diet pattern from recent nutrition logs (P/C/F % of calories).
 * Requires at least 5 days with entries. Returns type + percentages for optional macro adjustment.
 * @param {Array<{ date, entries: Array<{calories, protein, carbs, fat}> }>} nutritionLogs
 * @param {string[]} dayKeys - e.g. last 14 days
 * @returns {{ type: string, proteinPct: number, carbPct: number, fatPct: number } | null}
 */
export function getDietPattern(nutritionLogs, dayKeys) {
  if (!Array.isArray(nutritionLogs) || !Array.isArray(dayKeys) || dayKeys.length < 5) return null
  let totalCal = 0
  let totalP = 0
  let totalC = 0
  let totalF = 0
  const keySet = new Set(dayKeys)
  let daysWithData = 0
  nutritionLogs.forEach((log) => {
    if (!keySet.has(log.date) || !log.entries?.length) return
    daysWithData++
    log.entries.forEach((e) => {
      const cal = e.calories || 0
      totalCal += cal
      totalP += (e.protein || 0) * 4
      totalC += (e.carbs || 0) * 4
      totalF += (e.fat || 0) * 9
    })
  })
  if (daysWithData < 5 || totalCal < 200) return null
  const proteinPct = (totalP / totalCal) * 100
  const carbPct = (totalC / totalCal) * 100
  const fatPct = (totalF / totalCal) * 100
  let type = 'balanced'
  if (carbPct < 20 && fatPct > 60) type = 'keto'
  else if (carbPct < 30 && fatPct > 50) type = 'low_carb'
  else if (carbPct >= 30 && carbPct < 45 && proteinPct >= 20) type = 'moderate_carb'
  else if (carbPct >= 50) type = 'high_carb'
  else if (proteinPct > 28 && carbPct >= 25 && carbPct <= 45) type = 'high_protein'
  else if (proteinPct > 26) type = 'high_protein'
  else if (fatPct > 45 && carbPct < 40) type = 'higher_fat'
  return { type, proteinPct, carbPct, fatPct }
}

/** Human-readable labels for diet pattern types (for UI). */
export const DIET_PATTERN_LABELS = {
  keto: 'lower-carb / keto-style',
  low_carb: 'low carb',
  moderate_carb: 'moderate carb',
  high_carb: 'higher carb',
  high_protein: 'high protein',
  higher_fat: 'higher fat',
  balanced: 'balanced',
}

/**
 * Recommended daily nutrition based on details, weight, optional loss-rate tier, and diet pattern.
 * @param {Object} personalDetails - { age, heightCm, goalWeightKg, goalExerciseLevel }
 * @param {number|null} currentWeightKg - latest weight from log
 * @param {{ nutritionLogs?: Array, dayKeys?: string[] }} options - for diet pattern; dayKeys = e.g. last 14 days
 */
export function getRecommendedNutrition(personalDetails, currentWeightKg, options = {}) {
  const weight = currentWeightKg ?? personalDetails?.startingWeightKg ?? null
  const height = personalDetails?.heightCm ?? null
  const age = personalDetails?.age ?? null
  if (weight == null || weight <= 0 || height == null || height <= 0) return null

  const bmr = mifflinStJeor(weight, height, age ?? 35)
  if (bmr == null) return null

  const goalLevel = personalDetails?.goalExerciseLevel ?? 'Gold'
  const activityMultipliers = { Bronze: 1.35, Gold: 1.5, Platinum: 1.65 }
  const multiplier = activityMultipliers[goalLevel] ?? 1.5
  let tdee = bmr * multiplier

  const goalKg = personalDetails?.goalWeightKg
  const inDeficit = goalKg != null && weight > goalKg && weight - goalKg > 1
  const lossRateTier = personalDetails?.desiredLossRateTier ?? personalDetails?.goalExerciseLevel ?? 'Gold'
  if (inDeficit) {
    const rateKgPerWeek = LOSS_RATE_KG_PER_WEEK[lossRateTier] ?? 0.75
    const deficit = deficitFromRate(rateKgPerWeek)
    tdee = Math.max(tdee - deficit, 1200)
  }

  const calories = Math.round(tdee)
  let proteinG = Math.round(Math.max(1.4 * weight, 100))
  let fatG = Math.round(0.28 * (calories / 9))
  let carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  carbsG = Math.max(50, Math.min(350, carbsG))

  const dietPattern = options.nutritionLogs && options.dayKeys?.length >= 5
    ? getDietPattern(options.nutritionLogs, options.dayKeys)
    : null

  if (dietPattern) {
    switch (dietPattern.type) {
      case 'keto':
        fatG = Math.round(0.7 * (calories / 9))
        proteinG = Math.round(Math.max(1.2 * weight, 80))
        carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
        carbsG = Math.max(20, Math.min(50, carbsG))
        break
      case 'low_carb':
        carbsG = Math.round(0.2 * (calories / 4))
        carbsG = Math.max(30, Math.min(80, carbsG))
        fatG = Math.round((calories - proteinG * 4 - carbsG * 4) / 9)
        fatG = Math.max(40, fatG)
        break
      case 'moderate_carb':
        carbsG = Math.round(0.4 * (calories / 4))
        carbsG = Math.max(100, Math.min(220, carbsG))
        fatG = Math.round((calories - proteinG * 4 - carbsG * 4) / 9)
        break
      case 'high_carb':
        carbsG = Math.round(0.55 * (calories / 4))
        carbsG = Math.max(150, Math.min(400, carbsG))
        fatG = Math.round((calories - proteinG * 4 - carbsG * 4) / 9)
        fatG = Math.max(30, Math.min(80, fatG))
        break
      case 'high_protein':
        proteinG = Math.round(Math.max(1.8 * weight, 120))
        const remainder = calories - proteinG * 4
        fatG = Math.round(0.3 * (remainder / 9))
        carbsG = Math.round((remainder - fatG * 9) / 4)
        carbsG = Math.max(50, Math.min(350, carbsG))
        break
      case 'higher_fat':
        fatG = Math.round(0.45 * (calories / 9))
        proteinG = Math.round(Math.max(1.3 * weight, 90))
        carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
        carbsG = Math.max(40, Math.min(180, carbsG))
        break
      default:
        break
    }
  }

  return {
    calories,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
    _dietPattern: dietPattern?.type ?? null,
    _inDeficit: inDeficit,
    _lossRateTier: inDeficit ? lossRateTier : null,
  }
}

/**
 * Format recommended range for display (e.g. "Cal 2000–2200, P 120–150g").
 */
export function formatRecommendedRange(rec) {
  if (!rec) return null
  const calLo = rec.calories - 100
  const calHi = rec.calories + 100
  return `Cal ${calLo}–${calHi} · P ${rec.protein}g · C ${rec.carbs}g · F ${rec.fat}g`
}
