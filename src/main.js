import './styles/variables.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/pages.css'

import { maybeShowEmailPopup } from './modules/email-popup.js'
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

// ── PASSWORD RECOVERY (via PIN) ───────────────────
window.__kasirme.openRecovery = () => {
  document.getElementById('loginScreen').style.display    = 'none'
  document.getElementById('recoveryScreen').style.display = 'flex'
  const err = document.getElementById('recoveryErr')
  if (err) err.innerHTML = ''
}

window.__kasirme.closeRecovery = () => {
  document.getElementById('recoveryScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display    = 'flex'
}

window.__kasirme.doRecovery = async () => {
  const pin    = document.getElementById('recoveryPin')?.value.trim()
  const pass   = document.getElementById('recoveryNewPass')?.value
  const pass2  = document.getElementById('recoveryNewPass2')?.value
  const errEl  = document.getElementById('recoveryErr')

  if (!state.settings.recoveryPin) {
    errEl.innerHTML = '<div class="alert alert-red">PIN pemulihan belum diatur untuk akun ini. Hubungi admin/support.</div>'
    return
  }
  if (pin !== state.settings.recoveryPin) {
    errEl.innerHTML = '<div class="alert alert-red">PIN pemulihan salah.</div>'
    return
  }
  if (!pass || pass.length < 6) {
    errEl.innerHTML = '<div class="alert alert-red">Password baru minimal 6 karakter.</div>'
    return
  }
  if (pass !== pass2) {
    errEl.innerHTML = '<div class="alert alert-red">Konfirmasi password baru tidak cocok.</div>'
    return
  }

  await updateSettings({ password: pass })
  errEl.innerHTML = ''
  document.getElementById('recoveryScreen').style.display = 'none'
  document.getElementById('loginScreen').style.display    = 'flex'
  document.getElementById('loginUser').value = state.settings.username || ''
  document.getElementById('loginPass').value = ''
  showToastDelayed('✓ Password berhasil direset. Silakan login dengan password baru.')
}

window.__kasirme.completeSetup = async () => {
  const nama  = document.getElementById('setupNamaToko')?.value.trim()
  const uname = document.getElementById('setupUsername')?.value.trim()
  const pass  = document.getElementById('setupPassword')?.value
  const pass2 = document.getElementById('setupPassword2')?.value
  const pin   = document.getElementById('setupRecoveryPin')?.value.trim()
  const errEl = document.getElementById('setupErr')

  if (!nama)  { errEl.innerHTML = '<div class="alert alert-red">Nama toko wajib diisi.</div>'; return }
  if (!uname) { errEl.innerHTML = '<div class="alert alert-red">Username wajib diisi.</div>'; return }
  if (!pass || pass.length < 6) { errEl.innerHTML = '<div class="alert alert-red">Password minimal 6 karakter.</div>'; return }
  if (pass !== pass2) { errEl.innerHTML = '<div class="alert alert-red">Konfirmasi password tidak cocok.</div>'; return }
  if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    errEl.innerHTML = '<div class="alert alert-red">PIN pemulihan wajib 4-6 digit angka.</div>'; return
  }

  await updateSettings({ namaToko: nama, username: uname, password: pass, recoveryPin: pin })
  await storage.setFirstRunDone()

  document.getElementById('setupScreen').style.display = 'none'
  document.getElementById('loginUser').value = uname
  document.getElementById('loginPass').value = ''
  renderLogin()
  showToastDelayed('✓ Setup berhasil! Silakan login dengan akun baru kamu.')
}

// [KEAMANAN] skipSetup dihapus — user wajib mengisi Setup Wizard.
// Tombol "Lewati" di HTML sudah dihapus.

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
// ✏️  Ganti nomor WA di SATU tempat ini saja
const WA_NUMBER = '6285798132246'

let _trialInfo = null
let _selectedPlan = 'bulanan' // default

const PLAN_INFO = {
  bulanan: { label: 'KasirMe Basic - Bulanan (Rp 49.000/bulan)' },
  tahunan: { label: 'KasirMe Basic - Tahunan (Rp 490.000/tahun)' },
}

const updatePlanCardStyles = () => {
  const monthly = document.getElementById('planMonthly')
  const yearly  = document.getElementById('planYearly')
  if (!monthly || !yearly) return
  const active   = 'background:rgba(99,102,241,0.15);border:2px solid #6366f1;border-radius:12px;padding:16px;text-align:left;cursor:pointer;position:relative;'
  const inactive = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;text-align:left;cursor:pointer;position:relative;'
  monthly.style.cssText = _selectedPlan === 'bulanan' ? active : inactive
  yearly.style.cssText  = _selectedPlan === 'tahunan' ? active : inactive
}

window.__kasirme.selectPlan = (plan) => {
  _selectedPlan = plan
  updatePlanCardStyles()
}

const showLockedScreen = () => {
  document.getElementById('lockedScreen').style.display = 'flex'
  document.getElementById('appShell').style.display     = 'none'
  document.getElementById('loginScreen').style.display  = 'none'
  document.getElementById('landingScreen').style.display = 'none'

  updatePlanCardStyles()

  // Tampilkan device ID sebagai referensi untuk support
  const did = getDeviceIdPublic()
  const el  = document.getElementById('upgradeDeviceId')
  if (el) el.textContent = `Device ID: ${did}`

  // Isi link WhatsApp (ganti nomor sesuai milik Anda)
  const wa = document.getElementById('upgradeWhatsapp')
  if (wa) {
    const msg = encodeURIComponent(`Halo, saya ingin upgrade KasirMe.\nPaket: ${PLAN_INFO[_selectedPlan].label}\nDevice ID: ${did}`)
    wa.href = `https://wa.me/${WA_NUMBER}?text=${msg}`
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

window.__kasirme.requestUpgrade = () => {
  const emailEl = document.getElementById('upgradeEmail')
  const email   = emailEl?.value?.trim()
  if (!email || !email.includes('@')) {
    document.getElementById('upgradeEmailHint').style.display = 'block'
    return
  }
  const did = getDeviceIdPublic()
  const msg = encodeURIComponent(`Halo, saya ingin upgrade KasirMe.\nPaket: ${PLAN_INFO[_selectedPlan].label}\nEmail: ${email}\nDevice ID: ${did}`)
  const url = `https://wa.me/${WA_NUMBER}?text=${msg}`

  // Buka tab WA segera (sebagai respons langsung klik user, hindari popup blocker)
  const win = window.open(url, '_blank', 'noopener')
  if (!win) {
    // Fallback jika tetap diblokir: arahkan tab saat ini
    window.location.href = url
  }

  // Simpan email ke Supabase di belakang (tidak menghambat redirect WA)
  saveTrialEmail(email).catch(() => {})
}

// ── BOOT ─────────────────────────────────────────
;(async () => {
  await migrateFromLocalStorage()
  await load()
  await seed()
  applyTheme()

  // --- Cek status trial dari Supabase ---
  _trialInfo = await initTrial()
  await maybeShowEmailPopup(_trialInfo)

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
