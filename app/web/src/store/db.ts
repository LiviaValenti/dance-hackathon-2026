// All Dancer data stays on the phone (ADR 0003): one IndexedDB key-value store, with an in-memory
// fallback when IndexedDB is blocked (private mode etc.), so the app still works for the session.
const DB_NAME = 'dance'
const STORE = 'kv'
const OPEN_TIMEOUT_MS = 1500

let opening: Promise<IDBDatabase | null> | null = null
const memory = new Map<string, unknown>()

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    // Some browsers never answer when storage is blocked; don't keep the Dancer waiting.
    setTimeout(() => resolve(null), OPEN_TIMEOUT_MS)
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return opening
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return open().then((db) => {
    if (!db) return undefined
    return new Promise<T | undefined>((resolve) => {
      try {
        const request = action(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => resolve(undefined)
      } catch {
        resolve(undefined)
      }
    })
  })
}

export async function load<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T
  const value = await run<T>('readonly', (s) => s.get(key))
  if (value !== undefined) memory.set(key, value)
  return value
}

export async function save<T>(key: string, value: T): Promise<void> {
  memory.set(key, value)
  await run('readwrite', (s) => s.put(value, key))
}

/** Forgets everything: profile, Level, Plan and Attempts. */
export async function clearAll(): Promise<void> {
  memory.clear()
  await run('readwrite', (s) => s.clear())
}
