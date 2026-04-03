/**
 * Business-Hour Clock — TypeScript Implementation
 * Mirrors the Postgres compute_business_hours() function.
 * Mon–Fri, 8:00 AM – 5:00 PM Central Time. 9 hours per day.
 */

export interface PauseInterval {
  paused_at: string
  resumed_at: string | null
}

export interface ClockInput {
  clock_started_at: string
  total_hours: number
  pause_intervals: PauseInterval[]
  clock_status: 'running' | 'paused' | 'expired' | 'stopped'
}

export interface ClockOutput {
  business_hours_elapsed: number
  business_hours_total: number
  business_hours_remaining: number
  percent_elapsed: number
  status: 'running' | 'paused' | 'expired' | 'stopped'
  urgency: 'ok' | 'warning' | 'critical' | 'expired'
  started_at: string
  expires_at_estimated: string | null
}

const CT_TZ = 'America/Chicago'
const BIZ_START_HOUR = 8
const BIZ_END_HOUR = 17

/**
 * Compute elapsed business minutes between two timestamps, minus paused intervals.
 */
export function computeBusinessMinutes(
  startISO: string,
  endISO: string,
  pauseIntervals: PauseInterval[]
): number {
  const start = new Date(startISO)
  const end = new Date(endISO)
  if (end <= start) return 0

  let totalMinutes = 0
  const startCT = toCentralMidnight(start)
  const endCT = toCentralMidnight(end)
  const current = new Date(startCT)

  while (current <= endCT) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      const dayBizStart = centralToUTC(current, BIZ_START_HOUR, 0)
      const dayBizEnd = centralToUTC(current, BIZ_END_HOUR, 0)
      const windowStart = new Date(Math.max(start.getTime(), dayBizStart.getTime()))
      const windowEnd = new Date(Math.min(end.getTime(), dayBizEnd.getTime()))

      if (windowEnd > windowStart) {
        let dayMinutes = (windowEnd.getTime() - windowStart.getTime()) / 60000

        for (const pause of pauseIntervals) {
          const pStart = new Date(pause.paused_at)
          const pEnd = pause.resumed_at ? new Date(pause.resumed_at) : end
          const overlapStart = new Date(Math.max(pStart.getTime(), windowStart.getTime()))
          const overlapEnd = new Date(Math.min(pEnd.getTime(), windowEnd.getTime()))
          if (overlapEnd > overlapStart) {
            dayMinutes -= (overlapEnd.getTime() - overlapStart.getTime()) / 60000
          }
        }

        totalMinutes += Math.max(dayMinutes, 0)
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return totalMinutes
}

/**
 * Estimate when the clock will expire given remaining business minutes.
 */
export function estimateExpiry(fromISO: string, remainingMinutes: number): Date {
  let minutesLeft = remainingMinutes
  const from = new Date(fromISO)
  const cursor = new Date(Math.max(from.getTime(), Date.now()))
  const currentDay = toCentralMidnight(cursor)

  for (let safety = 0; safety < 365 && minutesLeft > 0; safety++) {
    const dow = currentDay.getDay()
    if (dow !== 0 && dow !== 6) {
      const dayBizStart = centralToUTC(currentDay, BIZ_START_HOUR, 0)
      const dayBizEnd = centralToUTC(currentDay, BIZ_END_HOUR, 0)
      const windowStart = new Date(Math.max(cursor.getTime(), dayBizStart.getTime()))

      if (dayBizEnd > windowStart) {
        const available = (dayBizEnd.getTime() - windowStart.getTime()) / 60000
        if (available >= minutesLeft) {
          return new Date(windowStart.getTime() + minutesLeft * 60000)
        }
        minutesLeft -= available
      }
    }
    currentDay.setDate(currentDay.getDate() + 1)
    cursor.setTime(centralToUTC(currentDay, BIZ_START_HOUR, 0).getTime())
  }

  return cursor
}

/**
 * Full clock computation: ClockInput → ClockOutput
 */
export function computeClock(input: ClockInput): ClockOutput {
  const now = new Date().toISOString()

  // For paused clocks, compute elapsed up to the last pause time
  const effectiveEnd = input.clock_status === 'paused'
    ? (input.pause_intervals[input.pause_intervals.length - 1]?.paused_at || now)
    : now

  const elapsedMinutes = computeBusinessMinutes(
    input.clock_started_at,
    effectiveEnd,
    input.pause_intervals
  )

  const totalMinutes = input.total_hours * 60
  const remainingMinutes = Math.max(totalMinutes - elapsedMinutes, 0)
  const elapsedHours = Math.round(elapsedMinutes / 60 * 100) / 100
  const remainingHours = Math.round(remainingMinutes / 60 * 100) / 100
  const percentElapsed = totalMinutes > 0 ? elapsedMinutes / totalMinutes : 0

  let status = input.clock_status
  if (status === 'running' && percentElapsed >= 1.0) status = 'expired'

  let urgency: ClockOutput['urgency']
  if (percentElapsed >= 1.0) urgency = 'expired'
  else if (percentElapsed >= 0.85) urgency = 'critical'
  else if (percentElapsed >= 0.60) urgency = 'warning'
  else urgency = 'ok'

  const expiresAt = (status === 'running' || status === 'paused')
    ? estimateExpiry(now, remainingMinutes)
    : null

  return {
    business_hours_elapsed: elapsedHours,
    business_hours_total: input.total_hours,
    business_hours_remaining: remainingHours,
    percent_elapsed: Math.round(percentElapsed * 10000) / 10000,
    status,
    urgency,
    started_at: input.clock_started_at,
    expires_at_estimated: expiresAt?.toISOString() || null,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toCentralMidnight(utcDate: Date): Date {
  const ct = new Date(utcDate.toLocaleString('en-US', { timeZone: CT_TZ }))
  ct.setHours(0, 0, 0, 0)
  return ct
}

function centralToUTC(centralMidnight: Date, hours: number, minutes: number): Date {
  const dateStr = `${centralMidnight.getFullYear()}-${String(centralMidnight.getMonth() + 1).padStart(2, '0')}-${String(centralMidnight.getDate()).padStart(2, '0')}`
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  const naive = new Date(`${dateStr}T${timeStr}`)
  // Determine CT UTC offset: CDT = UTC-5, CST = UTC-6
  const jan = new Date(naive.getFullYear(), 0, 1)
  const jul = new Date(naive.getFullYear(), 6, 1)
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
  const isDST = naive.getTimezoneOffset() < stdOffset
  const ctOffsetMs = isDST ? -5 * 3600000 : -6 * 3600000
  return new Date(naive.getTime() - ctOffsetMs)
}
