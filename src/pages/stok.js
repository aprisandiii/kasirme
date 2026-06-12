import { state, addStokLog, save } from '../modules/state.js'
import { esc, showToast }           from '../utils/index.js'
import { renderDashboard }          from './dashboard.js'

export const renderStokSelect = () => {
  const sel = document.getElementById('stokProdukSel')
  if (!sel) return
  sel.innerHTML = '<option value="">-- pilih produk --</option>' +
    state.products.map(p =>
      `<option value="${p.id}">${esc(p.nama)} (stok: ${p.stok})</option>`
    ).join('')
}

export const updateStokInfo = () => {
  const id   = parseInt(document.getElementById('stokProdukSel')?.value)
  const info = document.getElementById('stokCurrentInfo')
  const valEl = document.getElementById('stokCurrentVal')
  const p    = state.products.find(x => x.id === id)

  if (p && info && valEl) {
    info.style.display = 'block'
    valEl.textContent  = p.stok
  } else if (info) {
    info.style.display = 'none'
  }
}

export const simpanPenyesuaianStok = () => {
  const id    = parseInt(document.getElementById('stokProdukSel')?.value)
  const p     = state.products.find(x => x.id === id)
  if (!p) { alert('Pilih produk terlebih dahulu'); return }

  const jml   = parseInt(document.getElementById('stokJumlah')?.value) || 0
  if (jml <= 0) { alert('Jumlah harus lebih dari 0'); return }

  const jenis = document.getElementById('stokJenis')?.value
  const ket   = document.getElementById('stokKet')?.value.trim() || ''
  const before = p.stok

  if (jenis === 'masuk') {
    p.stok += jml
    addStokLog(p.id, p.nama, jml, 'masuk', ket || 'Stok masuk manual')
  } else if (jenis === 'keluar') {
    if (jml > p.stok) { alert(`Jumlah melebihi stok saat ini (${p.stok})`); return }
    p.stok -= jml
    addStokLog(p.id, p.nama, jml, 'keluar', ket || 'Stok keluar manual')
  } else {
    // koreksi
    const selisih = jml - before
    p.stok = jml
    addStokLog(
      p.id, p.nama,
      Math.abs(selisih),
      selisih >= 0 ? 'masuk' : 'keluar',
      `Koreksi: ${before} → ${jml}${ket ? ' (' + ket + ')' : ''}`
    )
  }

  save()

  // Reset form
  const jmlEl = document.getElementById('stokJumlah')
  const ketEl = document.getElementById('stokKet')
  if (jmlEl) jmlEl.value = ''
  if (ketEl) ketEl.value = ''

  renderStokSelect()
  updateStokInfo()
  renderStokLog()
  renderDashboard()
  showToast(`✓ Stok ${p.nama} diperbarui`)
}

export const renderStokLog = () => {
  const el = document.getElementById('stokLogList')
  if (!el) return

  if (!state.stokLog.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px">
      <i class="ti ti-clipboard-off"></i><p>Belum ada perubahan stok</p>
    </div>`
    return
  }

  el.innerHTML = state.stokLog.slice(0, 100).map(l => `
    <div class="stok-log-item">
      <div class="stok-log-body">
        <div class="stok-log-name">${esc(l.prodNama)}</div>
        <div class="stok-log-meta">${esc(l.ts)} — ${esc(l.ket)}</div>
      </div>
      <div class="stok-delta ${l.jenis === 'masuk' ? 'plus' : 'minus'}">
        ${l.jenis === 'masuk' ? '+' : '-'}${l.qty}
      </div>
    </div>`
  ).join('')
}
