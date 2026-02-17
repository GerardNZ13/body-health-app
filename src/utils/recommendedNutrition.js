/**
 * Recommended daily nutrition range based on personal details and current weight.
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

/**
 * Recommended daily nutrition based on details and current weight.
 * Returns { calories, protein, carbs, fat } or null if not enough data.
 * @param {Object} personalDetails - { age, heightCm, goalWeightKg, goalExerciseLevel }
 * @param {number|null} currentWeightKg - latest weight from log
 */
export function getRecommendedNutrition(personalDetails, currentWeightKg) {
  const weight = currentWeightKg ?? personalDetails?.startingWeightKg ?? null
  const height = personalDetails?.heightCm ?? null
  const age = personalDetails?.age ?? null
  if (weight == null || weight <= 0 || height == null || height <= 0) return null

  const bmr = mifflinStJeor(weight, height, age ?? 35)
  if (bmr == null) return null

  const activityLevel = personalDetails?.goalExerciseLevel ?? 'Gold'
  const activityMultipliers = { Bronze: 1.35, Gold: 1.5, Platinum: 1.65 }
  const multiplier = activityMultipliers[activityLevel] ?? 1.5
  let tdee = bmr * multiplier

  const goalKg = personalDetails?.goalWeightKg
  if (goalKg != null && weight > goalKg && weight - goalKg > 1) {
    const deficit = 400
    tdee = Math.max(tdee - deficit, 1200)
  }

  const calories = Math.round(tdee)
  const proteinG = Math.round(Math.max(1.4 * weight, 100))
  const fatG = Math.round(0.28 * (calories / 9))
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  const safeCarbs = Math.max(50, Math.min(350, carbsG))

  return {
    calories,
    protein: proteinG,
    carbs: safeCarbs,
    fat: fatG,
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
