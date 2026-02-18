/**
 * One-line hydration insight from recent logging and today's check/refills.
 * Three flavours: not logging (nudge to drink), consistent (keep it up), uh-oh (refill + walk).
 */

/**
 * @param {Array<{ date: string, hydrationCheck?: number, refills?: number }>} nutritionLogs - Logs that may have hydrationCheck/refills
 * @param {string[]} dayKeys - Last N day keys (e.g. last 7)
 * @param {string} todayKey - Today's date key
 * @returns {{ id: string, label: string, timeframe: string, message: string } | null}
 */
export function getHydrationInsight(nutritionLogs, dayKeys, todayKey) {
  if (!Array.isArray(nutritionLogs) || !Array.isArray(dayKeys) || dayKeys.length === 0) return null

  const recentLogs = dayKeys
    .map((date) => nutritionLogs.find((l) => l.date === date))
    .filter(Boolean)
  const daysWithHydration = recentLogs.filter(
    (l) => l.hydrationCheck != null || l.refills != null
  ).length
  const todayLog = nutritionLogs.find((l) => l.date === todayKey)
  const todayCheck = todayLog?.hydrationCheck
  const todayRefills = todayLog?.refills

  // Uh oh: today they're logging and it's dark or very few refills
  const isDarkToday = todayCheck != null && todayCheck >= 4
  const isLowRefillsToday = todayRefills != null && todayRefills <= 1
  if ((isDarkToday || isLowRefillsToday) && (todayCheck != null || todayRefills != null)) {
    return {
      id: 'hydration-uhoh',
      label: 'Hydration',
      timeframe: 'Today',
      message: "Uh oh, you definitely need to refill that bottle — maybe take a quick walk while you're up.",
    }
  }

  // Not logging: hardly any days with hydration data
  if (daysWithHydration < 2) {
    return {
      id: 'hydration-not-logging',
      label: 'Hydration',
      timeframe: 'Lately',
      message: "You're not logging your hydration, but you're probably needing more water.",
    }
  }

  // Consistent & good: logging several days and today (or recent) looks fine
  const recentChecks = recentLogs
    .map((l) => l.hydrationCheck)
    .filter((v) => v != null)
  const mostlyLight = recentChecks.length > 0 && recentChecks.filter((c) => c <= 2).length >= Math.ceil(recentChecks.length / 2)
  const todayLight = todayCheck == null || todayCheck <= 3
  if (daysWithHydration >= 3 && (mostlyLight || todayLight)) {
    return {
      id: 'hydration-consistent',
      label: 'Hydration',
      timeframe: 'Lately',
      message: "You're really consistent with hydration, keep it up.",
    }
  }

  return null
}
