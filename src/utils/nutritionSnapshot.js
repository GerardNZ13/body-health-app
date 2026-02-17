/**
 * Returns 'green' | 'orange' | 'red' for daily entries or weekly average.
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
    // Weekly we only judge on calories for simplicity; could extend to macros
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
    if (calories === 0) return 'orange' // no data
    if (cRatio >= 0.85 && cRatio <= 1.15) return 'green'
    if (cRatio >= 0.7 && cRatio <= 1.3) return 'orange'
    return 'red'
  }

  // Daily: consider both calories and protein
  const calOk = cRatio >= 0.8 && cRatio <= 1.2
  const proteinOk = pRatio >= 0.7
  if (calories === 0) return 'orange' // not logged
  if (calOk && proteinOk) return 'green'
  if (calOk || proteinOk) return 'orange'
  return 'red'
}
