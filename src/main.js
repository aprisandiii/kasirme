import './styles/variables.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/pages.css'

import { load, seed, state, updateSettings }  from './modules/state.js'
import { storage, migrateFromLocalStorage }    from './modules/storage.js'
import { renderLogin, doLogin, checkSessionExpiry } from './modules/auth.js'
import './app.js'

// ── FIRST RUN SETUP WIZARD ────────────────────────
const showFirstRunSetup = () => {
  document.getElementById('landingScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display = 'none'
  document.getElementById('appShell').style.display    = 'none'
  document.getElementById('setupScreen').style.display = 'flex'
}

const showLanding = () => {
  document.getElementById('setupScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display = 'none'
  document.getElementById('appShell').style.display    = 'none'
  document.getElementById('landingScreen').style.display = 'flex'
}

window.__kasirme = { ...(window.__kasirme || {}), doLogin }

window.__kasirme.gotoLanding = () => {
  document.getElementById('landingScreen').style.display = 'flex'
  document.getElementById('loginScreen').style.display   = 'none'
}
window.__kasirme.gotoLogin = () => {
  document.getElementById('landingScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display   = 'flex'
}

window.__kasirme.completeSetup = async () => {
  const nama  = document.getElementById('setupNamaToko')?.value.trim()
  const uname = document.getElementById('setupUsername')?.value.trim()
  const pass  = document.getElementById('setupPassword')?.value
  const pass2 = document.getElementById('setupPassword2')?.value
  const errEl = document.getElementById('setupErr')

  if (!nama)  { errEl.innerHTML = '<div class="alert alert-red">Nama toko wajib diisi.</div>'; return }
  if (!uname) { errEl.innerHTML = '<div class="alert alert-red">Username wajib diisi.</div>'; return }
  if (!pass || pass.length < 6) { errEl.innerHTML = '<div class="alert alert-red">Password minimal 6 karakter.</div>'; return }
  if (pass !== pass2) { errEl.innerHTML = '<div class="alert alert-red">Konfirmasi password tidak cocok.</div>'; return }

  await updateSettings({ namaToko: nama, username: uname, password: pass })
  await storage.setFirstRunDone()

  document.getElementById('setupScreen').style.display = 'none'
  document.getElementById('loginUser').value = uname
  document.getElementById('loginPass').value = ''
  renderLogin()
  showToastDelayed('✓ Setup berhasil! Silakan login dengan akun baru kamu.')
}

window.__kasirme.skipSetup = async () => {
  await storage.setFirstRunDone()
  document.getElementById('setupScreen').style.display = 'none'
  renderLogin()
}

const showToastDelayed = (msg) => {
  setTimeout(() => {
    const area = document.getElementById('toastArea')
    if (!area) return
    const d = document.createElement('div')
    d.className = 'toast toast-green'
    d.textContent = msg
    area.appendChild(d)
    setTimeout(() => d.remove(), 3200)
  }, 100)
}

// ── DARK MODE ──────────────────────────────────────
export const applyTheme = () => {
  document.documentElement.classList.toggle('dark', !!state.settings.darkMode)
}
window.__kasirme.toggleDarkMode = async () => {
  await updateSettings({ darkMode: !state.settings.darkMode })
  applyTheme()
}

// ── BOOT ─────────────────────────────────────────
;(async () => {
  await migrateFromLocalStorage()
  await load()
  await seed()
  applyTheme()

  const firstRun = await storage.isFirstRun()
  if (firstRun) {
    showFirstRunSetup()
    return
  }

  // Auto-logout jika sesi sebelumnya kedaluwarsa
  await checkSessionExpiry()

  showLanding()
})()

// ── PWA: Register Service Worker ──────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
