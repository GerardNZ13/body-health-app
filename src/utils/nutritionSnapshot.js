/**
 * Returns 'green' | 'orange' | 'red' for daily entries or weekly average.
 *
 * Bands are set to be inclusive so that larger people (e.g. 130kg+) and real-world
 * logging (rounding, missed items) don't unfairly show orange/red when they're
 * doing the right things. Still based on common guidance (within ~25% of target,
 * adequate protein for retention).
 *
 * Daily:
 *   - Calories: green 0.78–1.22 (~±22%), orange if one of cal/protein ok, red only if both off.
 *   - Protein: green if ≥ 65% of target (0.65); 70%+ is often cited, 65% is inclusive.
 * Weekly:
 *   - Calories only. Green 0.8–1.2, Orange 0.65–1.35, else Red.
 *
 * @param entriesOrCalories - array of nutrition entries for one day, OR a number (weekly avg calories)
 * @param targets - { calories, protein, carbs, fat }
 * @param isWeekly - if true, first arg is treated as average daily calories number
 */
export function nutritionSnapshot(entriesOrCalories, targets, isWeekly = false) {
  if (!targets) return 'orange'

  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0

  if (isWeekly && typeof entriesOrCalories === 'number') {
    calories = entriesOrCalories
  } else if (Array.isArray(entriesOrCalories)) {
    for (const e of entriesOrCalories) {
      calories += e.calories || 0
      protein += e.protein || 0
      carbs += e.carbs || 0
      fat += e.fat || 0
    }
  }

  const cTarget = targets.calories || 2200
  const pTarget = targets.protein || 120
  const cRatio = cTarget ? calories / cTarget : 0
  const pRatio = pTarget ? protein / pTarget : 0

  if (isWeekly) {
    if (calories === 0) return 'orange'
    if (cRatio >= 0.8 && cRatio <= 1.2) return 'green'
    if (cRatio >= 0.65 && cRatio <= 1.35) return 'orange'
    return 'red'
  }

  // Daily: wider green band so "close" still counts (fair for larger bodies / higher targets)
  const calOk = cRatio >= 0.78 && cRatio <= 1.22
  const proteinOk = pRatio >= 0.65
  if (calories === 0) return 'orange'
  if (calOk && proteinOk) return 'green'
  if (calOk || proteinOk) return 'orange'
  return 'red'
}
