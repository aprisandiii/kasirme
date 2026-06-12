import { openDB } from 'idb'
import { showToast } from '../utils/index.js'

const DB_NAME    = 'kasirme_db'
const DB_VERSION = 1
const STORE      = 'kv'

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    },
  })
  return _db
}

// ── MIGRATE: sekali jalan dari localStorage ke IndexedDB ──
export async function migrateFromLocalStorage() {
  const keys = ['km_products','km_transactions','km_stokLog','km_nextProdId','km_nextTrxNum','km_settings']
  const hasOldData = keys.some(k => localStorage.getItem(k) !== null)
  if (!hasOldData) return

  const db = await getDB()
  for (const k of keys) {
    const val = localStorage.getItem(k)
    if (val !== null) {
      await db.put(STORE, val, k)
      localStorage.removeItem(k)
    }
  }
  showToast('✓ Data lama berhasil dipindahkan ke penyimpanan baru', 'green')
}

const KEYS = {
  products:     'km_products',
  transactions: 'km_transactions',
  stokLog:      'km_stokLog',
  nextProdId:   'km_nextProdId',
  nextTrxNum:   'km_nextTrxNum',
  settings:     'km_settings',
  firstRun:     'km_first_run',
  lastActive:   'km_last_active',
}

// ── PASSWORD HASHING ──────────────────────────────
async function hashPassword(plain) {
  if (!plain || plain.startsWith('sha256:')) return plain
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export async function verifyPassword(plain, stored) {
  if (!stored) return false
  if (stored.startsWith('sha256:')) {
    const hashed = await hashPassword(plain)
    return hashed === stored
  }
  return plain === stored
}

export const storage = {
  async save(state) {
    try {
      const db = await getDB()
      const tx = db.transaction(STORE, 'readwrite')

      const settings = { ...state.settings }
      if (settings.password && !settings.password.startsWith('sha256:')) {
        settings.password = await hashPassword(settings.password)
        state.settings.password = settings.password
      }

      await tx.store.put(JSON.stringify(state.products),     KEYS.products)
      await tx.store.put(JSON.stringify(state.transactions), KEYS.transactions)
      await tx.store.put(JSON.stringify(state.stokLog),      KEYS.stokLog)
      await tx.store.put(String(state.nextProdId),           KEYS.nextProdId)
      await tx.store.put(String(state.nextTrxNum),           KEYS.nextTrxNum)
      await tx.store.put(JSON.stringify(settings),           KEYS.settings)
      await tx.done
    } catch (e) {
      console.error('Storage save error:', e)
      showToast('⚠️ Gagal menyimpan data', 'amber')
    }
  },

  async load(state) {
    try {
      const db = await getDB()
      const p  = await db.get(STORE, KEYS.products)
      const t  = await db.get(STORE, KEYS.transactions)
      const sl = await db.get(STORE, KEYS.stokLog)
      const s  = await db.get(STORE, KEYS.settings)
      const np = await db.get(STORE, KEYS.nextProdId)
      const nt = await db.get(STORE, KEYS.nextTrxNum)

      if (p)  state.products     = JSON.parse(p)
      if (t)  state.transactions = JSON.parse(t)
      if (sl) state.stokLog      = JSON.parse(sl)
      if (s)  state.settings     = Object.assign(state.settings, JSON.parse(s))

      state.nextProdId = parseInt(np) || (state.products.length + 1)
      state.nextTrxNum = parseInt(nt) || (state.transactions.length + 1)
    } catch (e) {
      console.warn('Failed to load from storage:', e)
    }
  },

  async isFirstRun() {
    try {
      const db  = await getDB()
      const val = await db.get(STORE, KEYS.firstRun)
      return val === undefined || val === null
    } catch { return true }
  },

  async setFirstRunDone() {
    try {
      const db = await getDB()
      await db.put(STORE, 'done', KEYS.firstRun)
    } catch {}
  },

  async getLastActive() {
    try {
      const db = await getDB()
      return await db.get(STORE, KEYS.lastActive)
    } catch { return null }
  },

  async setLastActive() {
    try {
      const db = await getDB()
      await db.put(STORE, Date.now().toString(), KEYS.lastActive)
    } catch {}
  },

  async clear() {
    const db = await getDB()
    const tx = db.transaction(STORE, 'readwrite')
    await Promise.all(Object.values(KEYS).map(k => tx.store.delete(k)))
    await tx.done
  },

  async exportAll(state) {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      products:     state.products,
      transactions: state.transactions,
      stokLog:      state.stokLog,
      settings:     { ...state.settings, password: undefined },
      nextProdId:   state.nextProdId,
      nextTrxNum:   state.nextTrxNum,
    }, null, 2)
  },

  async importAll(state, jsonStr) {
    const data = JSON.parse(jsonStr)
    if (data.products)     state.products     = data.products
    if (data.transactions) state.transactions = data.transactions
    if (data.stokLog)      state.stokLog      = data.stokLog
    if (data.nextProdId)   state.nextProdId   = data.nextProdId
    if (data.nextTrxNum)   state.nextTrxNum   = data.nextTrxNum
    if (data.settings)     state.settings     = Object.assign(state.settings, data.settings)
    await storage.save(state)
  }
}
