import { useMemo } from 'react'
import { useHealth } from '../store/HealthContext'
import {
  DEFAULT_TZ,
  getTodayKey as getTodayKeyBase,
  getWeekKeys as getWeekKeysBase,
  getDateKeyDaysAgo as getDateKeyDaysAgoBase,
  getDateKeyOffset,
  formatDate as formatDateBase,
  formatShortDate as formatShortDateBase,
  formatLongDate as formatLongDateBase,
  formatLongMonth as formatLongMonthBase,
} from '../utils/date'

/**
 * Date helpers bound to the user's chosen timezone from Personal details.
 * Use this hook in any component that needs "today", week keys, or formatted dates.
 */
export function useDateUtils() {
  const { personalDetails } = useHealth()
  const tz = personalDetails?.timeZone ?? DEFAULT_TZ

  return useMemo(
    () => ({
      timeZone: tz,
      getTodayKey: () => getTodayKeyBase(tz),
      getWeekKeys: (days = 7) => getWeekKeysBase(days, tz),
      getDateKeyDaysAgo: (days) => getDateKeyDaysAgoBase(days, tz),
      getDateKeyOffset,
      formatDate: (key) => formatDateBase(key, tz),
      formatShortDate: (key) => formatShortDateBase(key, tz),
      formatLongDate: (key) => formatLongDateBase(key, tz),
      formatLongMonth: (key) => formatLongMonthBase(key, tz),
    }),
    [tz]
  )
}
