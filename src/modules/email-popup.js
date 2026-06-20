/**
 * email-popup.js — Popup pengumpulan email saat pertama kali trial dimulai
 *
 * Cara pakai (di main.js, setelah initTrial()):
 *
 *   import { maybeShowEmailPopup } from './modules/email-popup.js'
 *   _trialInfo = await initTrial()
 *   await maybeShowEmailPopup(_trialInfo)   // ← tambahkan baris ini
 *
 * Tidak mengubah file lain sama sekali.
 */

import { saveTrialEmail } from './trial.js'

const STORAGE_KEY = 'km_email_collected'

/**
 * Tampilkan popup email jika:
 * - Status trial masih aktif (bukan expired / paid)
 * - Email belum pernah dikumpulkan sebelumnya
 *
 * Return Promise yang resolve setelah popup ditutup.
 */
export function maybeShowEmailPopup(trialInfo) {
  return new Promise((resolve) => {
    // Sudah punya email → skip
    if (trialInfo.email) {
      resolve()
      return
    }

    // Sudah pernah dikumpulkan / dilewati sebelumnya → skip
    if (localStorage.getItem(STORAGE_KEY)) {
      resolve()
      return
    }

    // Hanya tampilkan saat trial aktif
    if (trialInfo.status !== 'active') {
      resolve()
      return
    }

    _injectStyles()
    const overlay = _buildOverlay(resolve)
    document.body.appendChild(overlay)

    // Fokus ke input email
    setTimeout(() => {
      overlay.querySelector('#kmEmailInput')?.focus()
    }, 100)
  })
}

// ─── Private helpers ──────────────────────────────

function _buildOverlay(resolve) {
  const overlay = document.createElement('div')
  overlay.id = 'kmEmailPopupOverlay'
  overlay.innerHTML = `
    <div id="kmEmailPopupBox">
      <div id="kmEmailPopupIcon">
        <i class="ti ti-mail"></i>
      </div>
      <h2 id="kmEmailPopupTitle">Selamat Datang di KasirMe!</h2>
      <p id="kmEmailPopupDesc">
        Masukkan email kamu agar kami bisa mengirimkan info penting seputar
akun dan masa trial kamu (7 hari gratis).
      </p>

      <input
        type="email"
        id="kmEmailInput"
        placeholder="contoh@email.com"
        autocomplete="email"
        inputmode="email"
      />
      <div id="kmEmailErr" style="display:none">
        Format email tidak valid. Contoh: nama@email.com
      </div>

      <button id="kmEmailSubmit">
        <i class="ti ti-send"></i> Mulai Trial Gratis
      </button>
    </div>
  `

  // Submit
  overlay.querySelector('#kmEmailSubmit').addEventListener('click', () => {
    _handleSubmit(overlay, resolve)
  })

  // Enter key
  overlay.querySelector('#kmEmailInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _handleSubmit(overlay, resolve)
  })

  return overlay
}

async function _handleSubmit(overlay, resolve) {
  const input = overlay.querySelector('#kmEmailInput')
  const errEl = overlay.querySelector('#kmEmailErr')
  const btn   = overlay.querySelector('#kmEmailSubmit')
  const email = input.value.trim()

  // Validasi sederhana
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.style.display = 'block'
    input.focus()
    return
  }

  errEl.style.display = 'none'
  btn.disabled        = true
  btn.innerHTML       = '<i class="ti ti-loader-2" style="animation:kmSpin 1s linear infinite"></i> Menyimpan...'

  try {
    await saveTrialEmail(email)
    localStorage.setItem(STORAGE_KEY, 'collected')
  } catch (e) {
    // Gagal simpan ke Supabase → tetap lanjutkan, jangan blokir user
    console.warn('[EmailPopup] Gagal simpan email:', e.message)
    localStorage.setItem(STORAGE_KEY, 'failed')
  }

  _removeOverlay(overlay, resolve)
}

function _removeOverlay(overlay, resolve) {
  overlay.style.opacity = '0'
  overlay.style.transition = 'opacity 0.25s ease'
  setTimeout(() => {
    overlay.remove()
    resolve()
  }, 260)
}

function _injectStyles() {
  if (document.getElementById('kmEmailPopupStyles')) return

  const style = document.createElement('style')
  style.id = 'kmEmailPopupStyles'
  style.textContent = `
    #kmEmailPopupOverlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      backdrop-filter: blur(3px);
    }

    #kmEmailPopupBox {
      background: var(--bg, #fff);
      color: var(--txt, #1a1a1a);
      border-radius: 16px;
      padding: 32px 28px 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.18));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
    }

    #kmEmailPopupIcon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--green-light, #E1F5EE);
      color: var(--green, #1D9E75);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      margin-bottom: 4px;
    }

    #kmEmailPopupTitle {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
      color: var(--txt, #1a1a1a);
    }

    #kmEmailPopupDesc {
      font-size: 0.9rem;
      color: var(--txt2, #6b7280);
      margin: 0 0 6px;
      line-height: 1.5;
    }

    #kmEmailInput {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 14px;
      border: 1.5px solid var(--bdr2, rgba(0,0,0,0.14));
      border-radius: var(--radius, 8px);
      font-size: 0.95rem;
      background: var(--bg2, #f7f8f9);
      color: var(--txt, #1a1a1a);
      outline: none;
      transition: border-color 0.15s;
    }
    #kmEmailInput:focus {
      border-color: var(--green, #1D9E75);
    }

    #kmEmailErr {
      width: 100%;
      font-size: 0.82rem;
      color: var(--red-text, #A32D2D);
      background: var(--red, #FCEBEB);
      border-radius: var(--radius, 8px);
      padding: 8px 12px;
      text-align: left;
      box-sizing: border-box;
    }

    #kmEmailSubmit {
      width: 100%;
      padding: 12px;
      background: var(--green, #1D9E75);
      color: #fff;
      border: none;
      border-radius: var(--radius, 8px);
      font-size: 0.97rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      margin-top: 4px;
      transition: background 0.15s;
    }
    #kmEmailSubmit:hover:not(:disabled) {
      background: var(--green-dark, #0F6E56);
    }
    #kmEmailSubmit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    #kmEmailSkip {
      background: none;
      border: none;
      font-size: 0.82rem;
      color: var(--txt3, #9ca3af);
      cursor: pointer;
      padding: 4px 8px;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    #kmEmailSkip:hover {
      color: var(--txt2, #6b7280);
    }

    @keyframes kmSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}
