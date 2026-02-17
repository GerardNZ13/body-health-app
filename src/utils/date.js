/** Default timezone when none is set in personal details (e.g. before user has saved). */
export const DEFAULT_TZ = 'Pacific/Auckland'

/** Today's date in the given timezone as YYYY-MM-DD. */
export function getTodayKey(tz = DEFAULT_TZ) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

export function getWeekKeys(days = 7, tz = DEFAULT_TZ) {
  const keys = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setTime(d.getTime() - i * 24 * 60 * 60 * 1000)
    keys.push(d.toLocaleDateString('en-CA', { timeZone: tz }))
  }
  return keys
}

/** YYYY-MM-DD for N days ago (relative to today in the given timezone). */
export function getDateKeyDaysAgo(days, tz = DEFAULT_TZ) {
  const d = new Date()
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000)
  return d.toLocaleDateString('en-CA', { timeZone: tz })
}

/** YYYY-MM-DD for N days before a given date key (e.g. "2025-02-15", 7 => "2025-02-08"). Calendar math; use for trend windows. */
export function getDateKeyOffset(dateKey, daysBack) {
  const d = new Date(dateKey + 'T12:00:00')
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

/** Short display: "Mon 16 Feb" in the given timezone. */
export function formatDate(key, tz = DEFAULT_TZ) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Table-style short: "16 Feb" (no weekday). */
export function formatShortDate(key, tz = DEFAULT_TZ) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
  })
}

/** Long display with year: "Mon, 16 Feb 2026". */
export function formatLongDate(key, tz = DEFAULT_TZ) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Long month for journey text: "16 February 2026". */
export function formatLongMonth(key, tz = DEFAULT_TZ) {
  return new Date(key + 'T12:00:00').toLocaleDateString('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
