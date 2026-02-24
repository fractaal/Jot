import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'

let initialized = false

export function ensureDayJs() {
  if (!initialized) {
    dayjs.extend(utc)
    dayjs.extend(timezone)
    dayjs.extend(customParseFormat)
    initialized = true
  }
  return dayjs
}

export function nowInTimezone(tz: string) {
  const d = ensureDayJs()
  return d().tz(tz)
}
