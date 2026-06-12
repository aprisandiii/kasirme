import { state, voidTransaction } from '../modules/state.js'
import { rp, esc, openModal, closeModal, showToast } from '../utils/index.js'
import { showStruk } from './kasir.js'

let returTrxId = null

export const renderRiwayatTable = () => {
  const q   = (document.getElementById('searchRiwayat')?.value || '').toLowerCase()
  const tgl = document.getElementById('filterTgl')?.value

  const filtered = state.transactions
    .filter(t => {
      const mq = t.id.toLowerCase().includes(q) ||
        t.pelanggan.toLowerCase().includes(q) ||
        t.items.some(i => i.nama.toLowerCase().includes(q))
      return mq && (!tgl || t.tgl === tgl)
    })
    .slice().reverse()

  const tbody = document.getElementById('riwayatTbody')
  if (!tbody) return

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--txt2);padding:28px">
      Tidak ada transaksi ditemukan
    </td></tr>`
    return
  }

  tbody.innerHTML = filtered.map(t => {
    const statusBadge = t.status === 'retur'
      ? '<span class="badge badge-red">Retur</span>'
      : '<span class="badge badge-green">Selesai</span>'

    const metodeBadge = t.metode === 'qris' || t.metode === 'transfer'
      ? `<span class="badge badge-blue">${t.metode.toUpperCase()}</span>`
      : '<span class="badge badge-gray">Tunai</span>'

    const aksiRetur = t.status !== 'retur'
      ? `<button class="btn btn-sm btn-danger" onclick="window.__kasirme.openRetur('${esc(t.id)}')" title="Retur">
           <i class="ti ti-arrow-back"></i>
         </button>`
      : ''

    const qty = t.items.reduce((a, b) => a + b.qty, 0)

    return `<tr>
      <td style="font-family:monospace;font-size:11px;font-weight:700">${esc(t.id)}</td>
      <td style="font-size:11px;color:var(--txt2)">${esc(t.waktu)}</td>
      <td>${esc(t.pelanggan)}</td>
      <td style="font-size:12px">${t.items.length} item (${qty} qty)</td>
      <td>${metodeBadge}</td>
      <td style="font-weight:700;color:var(--green)">${rp(t.total)}</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="window.__kasirme.lihatStruk('${esc(t.id)}')" title="Lihat struk">
            <i class="ti ti-receipt"></i>
          </button>
          ${aksiRetur}
        </div>
      </td>
    </tr>`
  }).join('')
}

export const lihatStruk = (id) => {
  const t = state.transactions.find(x => x.id === id)
  if (t) showStruk(t, t.uangDiterima ?? 0)
}

export const openRetur = (id) => {
  returTrxId = id
  const t = state.transactions.find(x => x.id === id)
  if (!t) return

  const qty = t.items.reduce((a, b) => a + b.qty, 0)
  document.getElementById('returInfo').innerHTML =
    `<strong>${esc(t.id)}</strong> — ${esc(t.pelanggan)} — ${rp(t.total)}<br>
     <span style="color:var(--txt2);font-size:12px">${t.items.length} produk (${qty} qty) · Stok akan dikembalikan.</span>`
  document.getElementById('returAlasan').value  = ''
  document.getElementById('returCatatan').value = ''
  openModal('modalRetur')
}

export const konfirmasiRetur = async () => {
  if (!returTrxId) return
  const alasan  = document.getElementById('returAlasan').value
  const catatan = document.getElementById('returCatatan').value

  const ok = await voidTransaction(returTrxId, alasan, catatan)
  if (ok) {
    closeModal('modalRetur')
    renderRiwayatTable()
    showToast('✓ Retur berhasil, stok telah dikembalikan')
    returTrxId = null
  }
}
