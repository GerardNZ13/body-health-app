/**
 * BMI and weight-goal calculations from personal details and weight log.
 */

/** BMI = weight (kg) / (height (m))² */
export function bmi(weightKg, heightCm) {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

/** Weight (kg) at a given BMI for a height. Used to draw BMI bands on weight charts. */
export function weightAtBmi(bmi, heightCm) {
  if (bmi == null || heightCm == null || heightCm <= 0) return null
  const h = heightCm / 100
  return bmi * (h * h)
}

/** BMI band boundaries and labels for chart overlay (WHO-style). */
export const BMI_BANDS = [
  { bmiMax: 18.5, label: 'Underweight', color: 'rgba(59, 130, 246, 0.2)' },
  { bmiMax: 25, label: 'Healthy', color: 'rgba(34, 197, 94, 0.2)' },
  { bmiMax: 30, label: 'Overweight', color: 'rgba(234, 179, 8, 0.25)' },
  { bmiMax: 35, label: 'Obese I', color: 'rgba(249, 115, 22, 0.2)' },
  { bmiMax: 40, label: 'Obese II', color: 'rgba(239, 68, 68, 0.2)' },
  { bmiMax: null, label: 'Obese III', color: 'rgba(185, 28, 28, 0.25)' }, // no max
]

/**
 * BMI category. Returns { label, shortTip } — friendly, evidence-based.
 */
export function bmiCategory(bmiVal) {
  if (bmiVal == null || bmiVal <= 0) return null
  if (bmiVal < 18.5) return { label: 'underweight', shortTip: 'Strength and good nutrition will help; worth a check if it’s not intentional.' }
  if (bmiVal < 25) return { label: 'healthy range', shortTip: 'Keep doing what you’re doing—consistency wins.' }
  if (bmiVal < 30) return { label: 'overweight', shortTip: 'Losing even 5–10% of your weight can do good things for your body and energy.' }
  if (bmiVal < 35) return { label: 'in the obese range', shortTip: 'A steady half to one kg per week is the sweet spot—kind on your body and sustainable.' }
  if (bmiVal < 40) return { label: 'in the obese range', shortTip: 'Small steps add up; even 5% loss tends to help with blood pressure and how you feel.' }
  return { label: 'in the obese range', shortTip: 'Half to one kg per week is a good target—steady and manageable.' }
}

/**
 * Friendly take on weight change rate (kg/week). 0.5–1 kg/week is the evidence-based sweet spot.
 */
export function rateInterpretation(rateKgPerWeek) {
  if (rateKgPerWeek == null) return null
  const r = rateKgPerWeek
  if (r < -1) return 'That’s on the fast side—look after your protein and recovery so your body keeps up.'
  if (r <= -0.5) return 'That’s the sweet spot: sustainable and good for holding onto muscle.'
  if (r <= -0.25) return 'Slower loss is still progress. A bit more movement or a small cut can nudge it up if you want.'
  if (r <= 0.1) return 'Holding steady. A small deficit or more steps could get things moving again.'
  return 'Creeping up a bit—a small cut or extra steps usually turns it around.'
}

/**
 * Average rate of weight change (kg per week) from weight log over a period.
 * @param {Array<{date, value}>} weightRows - sorted by date
 * @returns { number | null } kg per week (negative = loss)
 */
export function averageRateKgPerWeek(weightRows) {
  if (!Array.isArray(weightRows) || weightRows.length < 2) return null
  const first = weightRows[0]
  const last = weightRows[weightRows.length - 1]
  const deltaKg = last.value - first.value
  const days = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)
  if (days <= 0) return null
  const weeks = days / 7
  return deltaKg / weeks
}

/**
 * Weeks to reach goal from current weight at a given rate (kg per week).
 * Rate should be negative for loss (e.g. -0.5).
 */
export function weeksToGoal(currentKg, goalKg, rateKgPerWeek) {
  if (currentKg == null || goalKg == null || rateKgPerWeek == null) return null
  const delta = goalKg - currentKg
  if (Math.abs(rateKgPerWeek) < 0.001) return null
  const weeks = delta / rateKgPerWeek
  return weeks > 0 ? weeks : null
}

/**
 * Required rate (kg per week) to reach goal in N weeks. Negative = loss.
 */
export function requiredRateKgPerWeek(currentKg, goalKg, weeks) {
  if (currentKg == null || goalKg == null || weeks == null || weeks <= 0) return null
  return (goalKg - currentKg) / weeks
}
