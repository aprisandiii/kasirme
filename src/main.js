import './styles/variables.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/pages.css'

import { load, seed, state, updateSettings }  from './modules/state.js'
import { storage, migrateFromLocalStorage }    from './modules/storage.js'
import { renderLogin, doLogin, checkSessionExpiry } from './modules/auth.js'
import { initTrial, saveTrialEmail, getDeviceIdPublic } from './modules/trial.js'
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

// ── TRIAL SYSTEM ───────────────────────────────────
let _trialInfo = null

const showLockedScreen = () => {
  document.getElementById('lockedScreen').style.display = 'flex'
  document.getElementById('appShell').style.display     = 'none'
  document.getElementById('loginScreen').style.display  = 'none'
  document.getElementById('landingScreen').style.display = 'none'

  // Tampilkan device ID sebagai referensi untuk support
  const did = getDeviceIdPublic()
  const el  = document.getElementById('upgradeDeviceId')
  if (el) el.textContent = `Device ID: ${did}`

  // Isi link WhatsApp (ganti nomor sesuai milik Anda)
  const wa = document.getElementById('upgradeWhatsapp')
  if (wa) {
    const msg = encodeURIComponent(`Halo, saya ingin upgrade KasirMe.\nDevice ID: ${did}`)
    wa.href = `https://wa.me/628XXXXXXXXXX?text=${msg}` // ← ganti nomor WA
  }
}

const showTrialBanner = (daysLeft) => {
  const banner = document.getElementById('trialBanner')
  const dlEl   = document.getElementById('trialDaysLeft')
  if (!banner) return
  if (dlEl) dlEl.textContent = daysLeft
  banner.style.display = 'flex'
  // Tambah padding bawah ke app shell agar konten tidak tertutup banner
  const shell = document.getElementById('appShell')
  if (shell) shell.style.paddingBottom = '50px'
}

window.__kasirme.showUpgradeScreen = () => showLockedScreen()

window.__kasirme.requestUpgrade = async () => {
  const emailEl = document.getElementById('upgradeEmail')
  const email   = emailEl?.value?.trim()
  if (!email || !email.includes('@')) {
    document.getElementById('upgradeEmailHint').style.display = 'block'
    return
  }
  try {
    await saveTrialEmail(email)
    const did = getDeviceIdPublic()
    const wa  = document.getElementById('upgradeWhatsapp')
    if (wa) {
      const msg = encodeURIComponent(`Halo, saya ingin upgrade KasirMe.\nEmail: ${email}\nDevice ID: ${did}`)
      wa.href = `https://wa.me/628XXXXXXXXXX?text=${msg}` // ← ganti nomor WA
      wa.click()
    }
  } catch {
    alert('Gagal menyimpan email. Silakan coba lagi atau hubungi kami langsung.')
  }
}

// ── BOOT ─────────────────────────────────────────
;(async () => {
  await migrateFromLocalStorage()
  await load()
  await seed()
  applyTheme()

  // --- Cek status trial dari Supabase ---
  _trialInfo = await initTrial()

  if (_trialInfo.status === 'expired') {
    showLockedScreen()
    return
  }

  // Trial masih aktif → lanjut flow normal
  const firstRun = await storage.isFirstRun()
  if (firstRun) {
    showFirstRunSetup()
    return
  }

  const expired = await checkSessionExpiry()
  if (expired) {
    showLanding()
    showToastDelayed('⏱️ Sesi sebelumnya telah berakhir. Silakan login kembali.')
    return
  }

  showLanding()

  // Tampilkan banner trial jika masih aktif (bukan paid)
  if (_trialInfo.status === 'active') {
    // Banner baru muncul setelah user login masuk ke appShell
    const origOnLoginSuccess = window.__kasirme._onLoginSuccessCb
    window.__kasirme._onLoginSuccessCb = () => {
      showTrialBanner(_trialInfo.daysLeft)
      origOnLoginSuccess?.()
    }
  }
})()

// ── PWA: Register Service Worker ──────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
