import { openDB, IDBPDatabase } from "idb"

export interface QueueRecord {
  id: string
  payload: object
  status: "pending" | "retrying" | "failed" | "sent"
  createdAt: number
  lastAttempt: number | null
  attempts: number
  error: string | null
}

const DB_NAME = "tsb-offline-queue"
const STORE = "submissions"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

export function openDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" })
        }
      },
    })
  }
  return dbPromise
}

export async function getAllRecords(): Promise<QueueRecord[]> {
  const db = await openDb()
  return db.getAll(STORE)
}

export async function getRecord(id: string): Promise<QueueRecord | undefined> {
  const db = await openDb()
  return db.get(STORE, id)
}

export async function putRecord(record: QueueRecord): Promise<void> {
  const db = await openDb()
  await db.put(STORE, record)
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDb()
  await db.delete(STORE, id)
}

export async function purgeOldFailed(): Promise<void> {
  const db = await openDb()
  const records: QueueRecord[] = await db.getAll(STORE)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const toDelete = records.filter(
    (r) => r.status === "failed" && r.createdAt < sevenDaysAgo
  )
  if (toDelete.length === 0) return
  const tx = db.transaction(STORE, "readwrite")
  await Promise.all([
    ...toDelete.map((r) => tx.store.delete(r.id)),
    tx.done,
  ])
}
