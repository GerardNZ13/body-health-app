/**
 * Soft, non-P/C/F nudges from daily nutrition totals (sodium, sugar, saturated fat, fiber).
 * Used on Nutrition page and Dashboard. Supportive tone only.
 */

const SODIUM_MG_THRESHOLD = 2300
const SUGARS_G_THRESHOLD = 50
const SATURATED_FAT_G_THRESHOLD = 22
const FIBER_G_LOW = 15

function dailyExtrasFromEntries(entries) {
  return (entries || []).reduce(
    (acc, e) => ({
      sodium: acc.sodium + (e.sodium || 0),
      sugars: acc.sugars + (e.sugars || 0),
      saturatedFat: acc.saturatedFat + (e.saturatedFat || 0),
      fiber: acc.fiber + (e.fiber || 0),
      hasSodium: acc.hasSodium || (e.sodium != null && e.sodium > 0),
      hasSugars: acc.hasSugars || (e.sugars != null && e.sugars > 0),
      hasSaturatedFat: acc.hasSaturatedFat || (e.saturatedFat != null && e.saturatedFat > 0),
      hasFiber: acc.hasFiber || (e.fiber != null && e.fiber > 0),
    }),
    { sodium: 0, sugars: 0, saturatedFat: 0, fiber: 0, hasSodium: false, hasSugars: false, hasSaturatedFat: false, hasFiber: false }
  )
}

/**
 * @param {Array<{ sodium?, sugars?, saturatedFat?, fiber? }>} todayEntries
 * @returns {Array<{ id: string, message: string }>}
 */
export function getGentleNudges(todayEntries) {
  const t = dailyExtrasFromEntries(todayEntries)
  const out = []
  if (t.hasSodium && t.sodium > SODIUM_MG_THRESHOLD) {
    out.push({ id: 'sodium', message: 'Today\u2019s a bit higher on sodium \u2014 extra water can help.' })
  }
  if (t.hasSugars && t.sugars > SUGARS_G_THRESHOLD) {
    out.push({ id: 'sugar', message: 'Big sugar day? We need those sometimes. Maybe a lower-sugar option next time if you feel like it.' })
  }
  if (t.hasSaturatedFat && t.saturatedFat > SATURATED_FAT_G_THRESHOLD) {
    out.push({ id: 'saturatedFat', message: 'Heavier on saturated fat today \u2014 no drama. Maybe balance with some veg or fish next time when you feel like it.' })
  }
  if (t.hasFiber && t.fiber > 0 && t.fiber < FIBER_G_LOW) {
    out.push({ id: 'fiber', message: 'Today\u2019s light on fiber. A bit more fruit, veg or whole grains when you can \u2014 no rush.' })
  }
  return out
}
