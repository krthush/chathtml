// Client-side storage helper that supports large values via IndexedDB.
// Falls back to localStorage if IndexedDB is unavailable.
//
// Why: localStorage has a small quota (~5–10MB) and `setItem` will throw
// QuotaExceededError for large HTML/code strings.

type DbEntry = { key: string; value: string };

const DB_NAME = 'chathtml';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

function isBrowser() {
  return typeof window !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));

    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      // tx error often duplicates request error, but keep a safe fallback
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
      db.close();
    };
  });
}

async function idbGetString(key: string): Promise<string | null> {
  const entry = await withStore<DbEntry | undefined>('readonly', (store) => store.get(key) as IDBRequest<DbEntry | undefined>);
  return entry?.value ?? null;
}

async function idbSetString(key: string, value: string): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put({ key, value }) as IDBRequest<IDBValidKey>);
}

async function idbRemove(key: string): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(key) as IDBRequest<undefined>);
}

async function idbKeysWithPrefix(prefix: string): Promise<string[]> {
  const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys() as IDBRequest<IDBValidKey[]>);
  return keys
    .map((k) => (typeof k === 'string' ? k : String(k)))
    .filter((k) => k.startsWith(prefix));
}

function safeLocalStorage() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getString(key: string): Promise<string | null> {
  // Prefer IDB (large values)
  try {
    const v = await idbGetString(key);
    if (v !== null) return v;
  } catch {
    // ignore and fall back
  }

  const ls = safeLocalStorage();
  return ls ? ls.getItem(key) : null;
}

export async function setString(key: string, value: string): Promise<void> {
  // Prefer IDB (large values)
  try {
    await idbSetString(key, value);
    return;
  } catch {
    // fall back
  }

  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, value);
  } catch (e) {
    // QuotaExceededError etc. Swallow to avoid crashing the UI.
    console.warn(`Failed to persist "${key}" to localStorage`, e);
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await idbRemove(key);
  } catch {
    // ignore and fall back
  }
  const ls = safeLocalStorage();
  try {
    ls?.removeItem(key);
  } catch {
    // ignore
  }
}

export async function keysWithPrefix(prefix: string): Promise<string[]> {
  try {
    return await idbKeysWithPrefix(prefix);
  } catch {
    // fall back
  }

  const ls = safeLocalStorage();
  if (!ls) return [];

  const keys: string[] = [];
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    // ignore
  }
  return keys;
}

// One-time migration helper: move values from localStorage to IndexedDB to free quota.
export async function migrateLocalStorageKeyToIdb(key: string): Promise<void> {
  const ls = safeLocalStorage();
  if (!ls) return;
  const v = ls.getItem(key);
  if (v == null) return;

  try {
    await idbSetString(key, v);
    ls.removeItem(key);
  } catch {
    // If migration fails, leave localStorage as-is.
  }
}


