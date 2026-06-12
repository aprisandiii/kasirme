import { state }                  from '../modules/state.js'
import { rp, esc, dateKey, csvEsc, hourOf } from '../utils/index.js'

// ── PERIOD FILTER ─────────────────────────────────
export const getFilteredTrx = () => {
  const v     = document.getElementById('laporanPeriod')?.value || 'harian'
  const valid = state.transactions.filter(t => t.status !== 'retur')

  if (v === 'harian') {
    const h = document.getElementById('laporanHari')?.value || dateKey()
    return valid.filter(t => t.tgl === h)
  }
  if (v === 'bulanan') {
    const b = document.getElementById('laporanBulan')?.value || ''
    return valid.filter(t => t.tgl.startsWith(b))
  }
  if (v === 'mingguan') {
    const now    = new Date()
    const wStart = dateKey(new Date(now.getTime() - 6 * 86400000))
    return valid.filter(t => t.tgl >= wStart && t.tgl <= dateKey(now))
  }
  if (v === 'custom') {
    const from = document.getElementById('customFrom')?.value
    const to   = document.getElementById('customTo')?.value
    return valid.filter(t => (!from || t.tgl >= from) && (!to || t.tgl <= to))
  }
  return valid
}

export const onPeriodChange = () => {
  const v = document.getElementById('laporanPeriod')?.value

  document.getElementById('laporanHari') ?.classList.toggle('hidden', v !== 'harian')
  document.getElementById('laporanBulan')?.classList.toggle('hidden', v !== 'bulanan')

  const cr = document.getElementById('customRange')
  if (cr) cr.style.display = v === 'custom' ? 'flex' : 'none'

  if (v === 'harian') {
    const h = document.getElementById('laporanHari')
    if (h) h.value = dateKey()
  }
  renderLaporan()
}

// ── TAB SWITCH ────────────────────────────────────
export const switchLaporanTab = (tab, el) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  el?.classList.add('active')
  ;['laporan-penjualan','laporan-produk','laporan-laba','laporan-waktu']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'))
  document.getElementById(`laporan-${tab}`)?.classList.remove('hidden')
  renderLaporan()
}

// ── MAIN RENDER ───────────────────────────────────
export const renderLaporan = () => {
  const filtered = getFilteredTrx()

  const total    = filtered.reduce((a, b) => a + b.total, 0)
  const trxCount = filtered.length
  const itemCount = filtered.reduce((a, b) => a + b.items.reduce((c, d) => c + d.qty, 0), 0)
  const avg      = trxCount ? Math.round(total / trxCount) : 0

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('l-total', rp(total))
  set('l-trx',   trxCount)
  set('l-item',  itemCount)
  set('l-avg',   rp(avg))

  _renderProdukTab(filtered)
  _renderLabaTab(filtered, total)
  _renderPeakChart(filtered)
}

// ── PRODUK TAB ────────────────────────────────────
const _renderProdukTab = (filtered) => {
  const tbody = document.getElementById('laporanProdukTbody')
  if (!tbody) return

  const sales = _calcSales(filtered)
  tbody.innerHTML = sales.length
    ? sales.map((r, i) => `<tr>
        <td style="color:var(--txt2)">${i + 1}</td>
        <td>${esc(r.nama)}</td>
        <td>${r.qty}</td>
        <td>${rp(r.rev)}</td>
        <td style="color:var(--txt2)">${rp(r.modal)}</td>
        <td style="color:var(--green);font-weight:700">${rp(r.laba)}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--txt2);padding:24px">Tidak ada data</td></tr>'
}

// ── LABA TAB ──────────────────────────────────────
const _renderLabaTab = (filtered, totalPendapatan) => {
  const totalModal = filtered.reduce((a, t) =>
    a + t.items.reduce((b, i) => b + i.qty * (i.modal || 0), 0), 0)
  const totalLaba = totalPendapatan - totalModal

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('ll-pendapatan', rp(totalPendapatan))
  set('ll-modal',      rp(totalModal))

  const labaEl = document.getElementById('ll-laba')
  if (labaEl) {
    labaEl.textContent = rp(totalLaba)
    labaEl.className   = 'metric-value ' + (totalLaba >= 0 ? 'metric-green' : 'metric-red')
  }

  const tbody = document.getElementById('laporanLabaTbody')
  if (!tbody) return

  const sales = _calcSales(filtered)
  tbody.innerHTML = sales.length
    ? sales.map(r => {
        const margin = r.rev > 0 ? Math.round(r.laba / r.rev * 100) : 0
        return `<tr>
          <td>${esc(r.nama)}</td>
          <td>${r.qty}</td>
          <td>${rp(r.rev)}</td>
          <td>${rp(r.modal)}</td>
          <td style="font-weight:700;color:${r.laba >= 0 ? 'var(--green)' : 'var(--red-text)'}">${rp(r.laba)}</td>
          <td>${margin}%</td>
        </tr>`
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--txt2);padding:24px">Tidak ada data</td></tr>'
}

// ── PEAK HOURS ────────────────────────────────────
const _renderPeakChart = (filtered) => {
  const el = document.getElementById('peakChart')
  if (!el) return

  const hourCount = new Array(24).fill(0)
  filtered.forEach(t => {
    const h = hourOf(t.waktu)
    if (h >= 0 && h < 24) hourCount[h]++
  })

  const mx = Math.max(...hourCount) || 1
  el.innerHTML = hourCount.map((v, h) => {
    const ht = Math.max(3, Math.round(v / mx * 80))
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div style="font-size:9px;color:var(--txt2);margin-bottom:1px">${v || ''}</div>
      <div style="background:var(--green);opacity:${0.3 + v / mx * 0.7};border-radius:2px 2px 0 0;width:100%;height:${ht}px" title="Jam ${h}.00: ${v} trx"></div>
    </div>`
  }).join('')
}

// ── HELPER ────────────────────────────────────────
const _calcSales = (filtered) => {
  const map = {}
  filtered.forEach(t => t.items.forEach(i => {
    if (!map[i.nama]) map[i.nama] = { qty: 0, rev: 0, modal: 0 }
    map[i.nama].qty   += i.qty
    map[i.nama].rev   += i.qty * i.harga - (i.disc || 0)
    map[i.nama].modal += i.qty * (i.modal || 0)
  }))
  return Object.entries(map)
    .map(([nama, v]) => ({ nama, ...v, laba: v.rev - v.modal }))
    .sort((a, b) => b.rev - a.rev)
}

// ── EXPORT CSV ────────────────────────────────────
export const exportCSV = () => {
  const filtered = getFilteredTrx()
  const rows = [
    ['ID','Tanggal','Waktu','Pelanggan','Metode','Produk','Qty','Harga','Disc','Subtotal','Total Trx','Diskon Trx']
  ]
  filtered.forEach(t => t.items.forEach(i => {
    rows.push([
      t.id, t.tgl, t.waktu, t.pelanggan, t.metode,
      i.nama, i.qty, i.harga, i.disc || 0,
      i.qty * i.harga - (i.disc || 0),
      t.total, t.diskon || 0
    ])
  }))

  const csv = '\uFEFF' + rows.map(r => r.map(csvEsc).join(',')).join('\n')
  const a   = document.createElement('a')
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `laporan_kasirme_${dateKey()}.csv`
  a.click()
}
