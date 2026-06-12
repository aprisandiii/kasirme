import { state }               from './state.js'
import { verifyPassword, storage } from './storage.js'
import { $, showToast }        from '../utils/index.js'

export let currentUser = null
let inactivityTimer = null

export const isLoggedIn = () => currentUser !== null

export const renderLogin = () => {
  document.getElementById('landingScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display = 'flex'
  document.getElementById('appShell').style.display    = 'none'
}

let _onLoginSuccess = null
export const setOnLoginSuccess = (fn) => { _onLoginSuccess = fn }

export const doLogin = async () => {
  const u     = document.getElementById('loginUser')?.value.trim()
  const p     = document.getElementById('loginPass')?.value
  const errEl = document.getElementById('loginErr')

  const usernameOk = u === state.settings.username
  const passwordOk = await verifyPassword(p, state.settings.password)

  if (usernameOk && passwordOk) {
    currentUser = u
    document.getElementById('loginScreen').style.display = 'none'
    document.getElementById('appShell').style.display    = 'flex'
    if (errEl) errEl.innerHTML = ''
    await storage.setLastActive()
    startInactivityWatcher()
    _onLoginSuccess?.()
    // Panggil trial callback jika ada (untuk banner trial)
    window.__kasirme._onLoginSuccessCb?.()
  } else {
    if (errEl) errEl.innerHTML = '<div class="alert alert-red">Username atau password salah.</div>'
  }
}

export const doLogout = (skipConfirm = false) => {
  if (!skipConfirm && !confirm('Keluar dari KasirMe?')) return
  currentUser = null
  stopInactivityWatcher()
  document.getElementById('appShell').style.display    = 'none'
  document.getElementById('loginScreen').style.display = 'flex'
  const lp = document.getElementById('loginPass')
  const le = document.getElementById('loginErr')
  if (lp) lp.value    = ''
  if (le) le.innerHTML = ''
}

// ── SESSION TIMEOUT ───────────────────────────────
const resetInactivityTimer = () => {
  storage.setLastActive()
  if (inactivityTimer) clearTimeout(inactivityTimer)
  const minutes = state.settings.sessionTimeout || 0
  if (minutes <= 0) return
  inactivityTimer = setTimeout(() => {
    if (isLoggedIn()) {
      showToast('⏱️ Sesi berakhir karena tidak ada aktivitas', 'amber')
      doLogout(true)
    }
  }, minutes * 60 * 1000)
}

let _listenersAttached = false
export const startInactivityWatcher = () => {
  if (!_listenersAttached) {
    ['click','keydown','mousemove','touchstart'].forEach(ev =>
      document.addEventListener(ev, resetInactivityTimer, { passive: true })
    )
    _listenersAttached = true
  }
  resetInactivityTimer()
}

export const stopInactivityWatcher = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = null
}

// Cek apakah sesi sebelumnya sudah lewat batas waktu (misal browser ditutup)
export const checkSessionExpiry = async () => {
  const minutes = state.settings.sessionTimeout || 0
  if (minutes <= 0) return false
  const last = await storage.getLastActive()
  if (!last) return false
  const elapsed = Date.now() - parseInt(last)
  return elapsed > minutes * 60 * 1000
}
