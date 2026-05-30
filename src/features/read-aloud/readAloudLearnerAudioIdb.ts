/**
 * Persists full read-aloud recordings that are too large to embed in sessionStorage JSON.
 * Key should stay stable across "Regenerate report" saves (see ReadAloudReportPayload.learnerAudioIdbKey).
 */

const DB_NAME = 'languageTutorReadAloud'
const STORE = 'learnerClips'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export type ReadAloudIdbClip = {
  blob: Blob
  mimeType: string
}

export async function putReadAloudLearnerClip(key: string, blob: Blob, mimeType: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('idb write failed'))
      tx.onabort = () => reject(tx.error ?? new Error('idb write aborted'))
      tx.objectStore(STORE).put({ blob, mimeType }, key)
    })
  } finally {
    db.close()
  }
}

export async function getReadAloudLearnerClip(key: string): Promise<ReadAloudIdbClip | null> {
  const db = await openDb()
  try {
    const row = await new Promise<ReadAloudIdbClip | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).get(key)
      r.onsuccess = () => resolve(r.result as ReadAloudIdbClip | undefined)
      r.onerror = () => reject(r.error ?? new Error('idb read failed'))
    })
    if (!row?.blob) return null
    return { blob: row.blob, mimeType: typeof row.mimeType === 'string' ? row.mimeType : 'audio/webm' }
  } finally {
    db.close()
  }
}

export async function deleteReadAloudLearnerClip(key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('idb delete failed'))
      tx.objectStore(STORE).delete(key)
    })
  } finally {
    db.close()
  }
}
