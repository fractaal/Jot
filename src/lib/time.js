const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

let initialized = false;

function ensureDayJs() {
  if (!initialized) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(customParseFormat);
    initialized = true;
  }

  return dayjs;
}

function nowInTimezone(tz) {
  const d = ensureDayJs();
  return d().tz(tz);
}

module.exports = {
  ensureDayJs,
  nowInTimezone,
};
