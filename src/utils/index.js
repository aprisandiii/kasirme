// ── FORMATTING ──────────────────────────────────
export const rp = (n) =>
  'Rp ' + Math.round(n).toLocaleString('id-ID')

export const dateKey = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayStr = () =>
  new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

export const csvEsc = (v) =>
  '"' + String(v).replace(/"/g, '""') + '"'

// ── SECURITY ─────────────────────────────────────
export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// ── DOM HELPERS ──────────────────────────────────
export const $ = (sel, ctx = document) => ctx.querySelector(sel)
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

export const showEl  = (el) => { if (el) el.classList.remove('hidden') }
export const hideEl  = (el) => { if (el) el.classList.add('hidden') }
export const toggleEl = (el, show) => show ? showEl(el) : hideEl(el)

export const openModal  = (id) => $(` #${id}`)?.classList.remove('hidden')
export const closeModal = (id) => $(`#${id}`)?.classList.add('hidden')
export const closeAllModals = () =>
  $$('.modal-overlay').forEach(m => m.classList.add('hidden'))

// ── TOAST ─────────────────────────────────────────
export const showToast = (msg, type = 'green') => {
  const area = document.getElementById('toastArea')
  if (!area) return
  const d = document.createElement('div')
  d.className = `toast toast-${type}`
  d.textContent = msg
  area.appendChild(d)
  setTimeout(() => d.remove(), 3200)
}

// ── HOUR EXTRACTOR (untuk peak hours) ────────────
export const hourOf = (waktu) => {
  const m = waktu.match(/\d+[:.]\d+/g)
  if (!m || !m[1]) return 0
  return parseInt(m[1].split(/[:.]/)[0]) || 0
}
