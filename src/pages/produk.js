import { state, addProduct, updateProduct, deleteProduct } from '../modules/state.js'
import { rp, esc, $, openModal, closeModal, showToast }    from '../utils/index.js'
import { renderDashboard } from './dashboard.js'

let editingId = null

// ── RENDER TABLE ──────────────────────────────────
export const renderProdukTable = () => {
  const q      = (document.getElementById('searchProduk')?.value || '').toLowerCase()
  const filtered = state.products.filter(p =>
    p.nama.toLowerCase().includes(q) ||
    p.kategori.toLowerCase().includes(q) ||
    (p.kode && p.kode.toLowerCase().includes(q))
  )

  const tbody = document.getElementById('produkTbody')
  if (!tbody) return

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--txt2);padding:28px">
      Produk tidak ditemukan
    </td></tr>`
    return
  }

  tbody.innerHTML = filtered.map(p => {
    const stokBadge = p.stok <= 0
      ? '<span class="badge badge-red">Habis</span>'
      : p.stok <= p.stokMin
        ? `<span class="badge badge-red">Hampir habis (${p.stok})</span>`
        : p.stok <= p.stokMin * 2
          ? `<span class="badge badge-amber">Perhatikan (${p.stok})</span>`
          : `<span class="badge badge-green">OK (${p.stok})</span>`

    return `<tr>
      <td>
        <strong>${esc(p.nama)}</strong>
        ${p.kode ? `<br><span style="font-size:11px;color:var(--txt2)">${esc(p.kode)}</span>` : ''}
      </td>
      <td><span class="badge badge-gray">${esc(p.kategori)}</span></td>
      <td style="font-weight:700">${rp(p.harga)}</td>
      <td style="color:var(--txt2)">${rp(p.modal || 0)}</td>
      <td>${p.stok}</td>
      <td>${stokBadge}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn btn-sm" onclick="window.__kasirme.editProduk(${p.id})" title="Edit">
            <i class="ti ti-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.__kasirme.hapusProduk(${p.id})" title="Hapus">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </td>
    </tr>`
  }).join('')
}

// ── KATEGORI SELECT ───────────────────────────────
export const renderKategoriSelect = () => {
  const el = document.getElementById('mpKategori')
  if (el) el.innerHTML = state.settings.kategori
    .map(k => `<option>${esc(k)}</option>`).join('')
}

// ── MODAL ─────────────────────────────────────────
export const openModalTambahProduk = () => {
  editingId = null
  document.getElementById('modalProdukTitle').textContent = 'Tambah Produk'
  ;['mpNama','mpHarga','mpModal','mpStok','mpKode'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  const minEl = document.getElementById('mpStokMin')
  if (minEl) minEl.value = '5'
  renderKategoriSelect()
  openModal('modalProduk')
  document.getElementById('mpNama')?.focus()
}

export const editProduk = (id) => {
  const p = state.products.find(x => x.id === id)
  if (!p) return
  editingId = id
  document.getElementById('modalProdukTitle').textContent = 'Edit Produk'
  renderKategoriSelect()
  document.getElementById('mpNama').value      = p.nama
  document.getElementById('mpKategori').value  = p.kategori
  document.getElementById('mpHarga').value     = p.harga
  document.getElementById('mpModal').value     = p.modal || 0
  document.getElementById('mpStok').value      = p.stok
  document.getElementById('mpStokMin').value   = p.stokMin
  document.getElementById('mpKode').value      = p.kode || ''
  openModal('modalProduk')
}

export const closeModalProduk = () => closeModal('modalProduk')

export const hapusProduk = (id) => {
  if (!confirm('Hapus produk ini?')) return
  deleteProduct(id)
  renderProdukTable()
  renderDashboard()
  showToast('Produk dihapus', 'amber')
}

export const simpanProduk = () => {
  const nama   = document.getElementById('mpNama').value.trim()
  const harga  = parseInt(document.getElementById('mpHarga').value) || 0
  const modal  = parseInt(document.getElementById('mpModal').value) || 0
  const stok   = parseInt(document.getElementById('mpStok').value) || 0
  const stokMin = parseInt(document.getElementById('mpStokMin').value) || 5
  const kat    = document.getElementById('mpKategori').value
  const kode   = document.getElementById('mpKode').value.trim()

  if (!nama)    { alert('Nama produk wajib diisi'); return }
  if (nama.length < 2) { alert('Nama produk minimal 2 karakter'); return }
  if (harga <= 0) { alert('Harga jual harus lebih dari 0'); return }
  if (modal < 0 || stok < 0 || stokMin < 0) { alert('Nilai tidak boleh negatif'); return }
  if (modal > harga) {
    if (!confirm('Harga modal lebih besar dari harga jual. Produk akan rugi jika terjual. Lanjutkan?')) return
  }
  const dup = state.products.find(p => p.nama.toLowerCase() === nama.toLowerCase() && p.id !== editingId)
  if (dup) { alert('Produk dengan nama ini sudah ada'); return }

  const data = { nama, kategori: kat, harga, modal, stok, stokMin, kode }
  if (editingId) {
    updateProduct(editingId, data)
  } else {
    addProduct(data)
  }

  closeModalProduk()
  renderProdukTable()
  renderDashboard()
  showToast('✓ Produk berhasil disimpan')
}

// ── IMPORT CSV ────────────────────────────────────
let csvRows = []

export const openImportCSV = () => {
  csvRows = []
  document.getElementById('csvPreview').textContent = ''
  document.getElementById('csvImportBtn').disabled  = true
  openModal('modalImportCSV')
}

export const previewCSV = (e) => {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = (ev) => {
    const lines = ev.target.result.split('\n').filter(l => l.trim())
    // Deteksi separator: semicolon (Excel Indonesia) atau comma
    const firstLine = lines[0] || ''
    const sep = firstLine.includes(';') ? ';' : ','

    csvRows = lines.slice(1).map(l => {
      const cols = l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
      return {
        nama: cols[0] || '', kategori: cols[1] || 'Lainnya',
        harga: parseInt(cols[2]) || 0, modal: parseInt(cols[3]) || 0,
        stok: parseInt(cols[4]) || 0, stokMin: parseInt(cols[5]) || 5,
        kode: cols[6] || ''
      }
    }).filter(r => r.nama && r.harga > 0)

    document.getElementById('csvPreview').textContent =
      `${csvRows.length} produk siap diimport (dari ${lines.length - 1} baris data). Separator: "${sep}"`
    document.getElementById('csvImportBtn').disabled = csvRows.length === 0
  }
  r.readAsText(file)
}

export const importCSV = () => {
  let added = 0
  csvRows.forEach(r => {
    const existing = state.products.find(p => p.nama === r.nama)
    if (existing) updateProduct(existing.id, r)
    else { addProduct(r); added++ }
  })
  closeModal('modalImportCSV')
  renderProdukTable()
  renderDashboard()
  showToast(`✓ ${added} produk ditambahkan, ${csvRows.length - added} diperbarui`)
}
