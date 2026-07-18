/**
 * Local-only photo persistence.
 *
 * Photos are stored in IndexedDB instead of localStorage so large data URLs do
 * not block the main thread or exhaust the much smaller synchronous storage
 * quota. Nothing in this module performs network I/O.
 */
import type { Capture } from '@/lib/store';

const DB_NAME = 'lumaface-local';
const DB_VERSION = 1;
const STORE_NAME = 'captures';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'captureId' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open photo database'));
    request.onblocked = () => reject(new Error('Photo database upgrade is blocked'));
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('Photo database transaction failed'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('Photo database transaction aborted'));
        };
        operation(store, resolve, reject);
      }),
  );
}

export async function loadLocalPhotos(): Promise<Capture[]> {
  if (!hasIndexedDb()) return [];
  return transact<Capture[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const captures = (request.result as Capture[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      resolve(captures);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalPhoto(capture: Capture): Promise<void> {
  return transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(capture);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalPhoto(captureId: string): Promise<void> {
  if (!hasIndexedDb()) return;
  return transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(captureId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearLocalPhotos(): Promise<void> {
  if (!hasIndexedDb()) return;
  return transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** One-time migration from the former lf_photos localStorage array. */
export async function migrateLegacyPhotos(raw: string | null): Promise<Capture[]> {
  const existing = await loadLocalPhotos();
  if (existing.length > 0 || !raw) return existing;

  let legacy: Capture[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) legacy = parsed as Capture[];
  } catch {
    return existing;
  }

  for (const capture of legacy) {
    if (capture?.captureId && capture?.dataUrl) await saveLocalPhoto(capture);
  }
  return loadLocalPhotos();
}
