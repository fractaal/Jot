import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

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
