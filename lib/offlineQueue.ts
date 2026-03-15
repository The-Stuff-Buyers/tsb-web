import { QueueRecord, getAllRecords, putRecord, deleteRecord } from "./offlineDb"
import { isOnline } from "./connectivity"

export async function enqueue(payload: object): Promise<string> {
  const id = crypto.randomUUID()
  const record: QueueRecord = {
    id,
    payload,
    status: "pending",
    createdAt: Date.now(),
    lastAttempt: null,
    attempts: 0,
    error: null,
  }
  await putRecord(record)
  return id
}

export async function getQueueStatus(): Promise<{
  pending: number
  retrying: number
  failed: number
  total: number
  records: QueueRecord[]
}> {
  const records = await getAllRecords()
  return {
    pending: records.filter((r) => r.status === "pending").length,
    retrying: records.filter((r) => r.status === "retrying").length,
    failed: records.filter((r) => r.status === "failed").length,
    total: records.length,
    records,
  }
}

// Returns the delay in ms before attempt N, where attempts = number of prior failures
function backoffDelay(attempts: number): number {
  switch (attempts) {
    case 0: return 0
    case 1: return 30_000
    case 2: return 2 * 60_000
    case 3: return 10 * 60_000
    case 4: return 30 * 60_000
    default: return 30 * 60_000
  }
}

function jitter(): number {
  return Math.random() * 2_000
}

function isReadyToRetry(record: QueueRecord): boolean {
  if (record.attempts === 0) return true
  if (!record.lastAttempt) return true
  const required = backoffDelay(record.attempts) + jitter()
  return Date.now() - record.lastAttempt >= required
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let isRetrying = false

export async function retryAll(): Promise<{ sent: number; failed: number }> {
  if (isRetrying) return { sent: 0, failed: 0 }
  isRetrying = true

  let sent = 0
  let failed = 0

  try {
    const records = await getAllRecords()
    const toProcess = records.filter(
      (r) => (r.status === "pending" || r.status === "retrying") && isReadyToRetry(r)
    )

    for (const record of toProcess) {
      const online = await isOnline()
      if (!online) break

      await putRecord({ ...record, status: "retrying" })

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record.payload),
        })

        if (res.ok) {
          await deleteRecord(record.id)
          sent++
        } else if (res.status === 429) {
          await putRecord({
            ...record,
            status: "retrying",
            attempts: record.attempts + 1,
            lastAttempt: Date.now(),
            error: "Rate limited (429)",
          })
          await sleep(60_000)
        } else if (res.status >= 400 && res.status < 500) {
          // Permanent 4xx failure
          let errorMsg = `HTTP ${res.status}`
          try {
            const data = await res.json()
            errorMsg = data.error || errorMsg
          } catch {}
          await putRecord({
            ...record,
            status: "failed",
            attempts: record.attempts + 1,
            lastAttempt: Date.now(),
            error: errorMsg,
          })
          failed++
        } else {
          // 5xx: increment attempts, check if max reached
          const newAttempts = record.attempts + 1
          if (newAttempts >= 5) {
            await putRecord({
              ...record,
              status: "failed",
              attempts: newAttempts,
              lastAttempt: Date.now(),
              error: `HTTP ${res.status} — max retries reached`,
            })
            failed++
          } else {
            await putRecord({
              ...record,
              status: "retrying",
              attempts: newAttempts,
              lastAttempt: Date.now(),
              error: `HTTP ${res.status}`,
            })
          }
        }
      } catch (err) {
        // Network error
        const newAttempts = record.attempts + 1
        const errMsg = err instanceof Error ? err.message : "Network error"
        if (newAttempts >= 5) {
          await putRecord({
            ...record,
            status: "failed",
            attempts: newAttempts,
            lastAttempt: Date.now(),
            error: `${errMsg} — max retries reached`,
          })
          failed++
        } else {
          await putRecord({
            ...record,
            status: "retrying",
            attempts: newAttempts,
            lastAttempt: Date.now(),
            error: errMsg,
          })
        }
      }
    }
  } finally {
    isRetrying = false
  }

  return { sent, failed }
}

export async function discardRecord(id: string): Promise<void> {
  await deleteRecord(id)
}
