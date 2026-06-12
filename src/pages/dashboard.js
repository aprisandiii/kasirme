import { state }         from '../modules/state.js'
import { rp, dateKey, esc } from '../utils/index.js'

export const renderDashboard = () => {
  const today    = dateKey()
  const todayTrx = state.transactions.filter(t => t.tgl === today && t.status !== 'retur')
  const todayTotal = todayTrx.reduce((a, b) => a + b.total, 0)
  const todayLaba  = todayTrx.reduce((a, t) =>
    a + t.items.reduce((b, i) => b + i.qty * (i.harga - (i.modal || 0)) - (i.disc || 0), 0), 0)

  document.getElementById('d-today').textContent  = rp(todayTotal)
  document.getElementById('d-trx').textContent    = todayTrx.length
  document.getElementById('d-laba').textContent   = rp(todayLaba)

  const low = state.products.filter(p => p.stok <= p.stokMin)
  document.getElementById('d-lowstok').textContent = low.length

  const lowBadge = document.getElementById('lowStokBadge')
  if (lowBadge) {
    if (low.length > 0) {
      lowBadge.textContent = low.length
      lowBadge.style.display = 'inline-flex'
    } else {
      lowBadge.style.display = 'none'
    }
  }

  _renderWeekChart()
  _renderRecentTrx()

  const alertEl = document.getElementById('lowstokAlert')
  alertEl.innerHTML = low.length
    ? `<div class="alert alert-amber"><i class="ti ti-alert-triangle"></i> <strong>${low.length} produk</strong> stok di bawah minimum: ${low.map(p => esc(p.nama) + ' (' + p.stok + ')').join(', ')}</div>`
    : ''
}

const _renderWeekChart = () => {
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
  const bars = document.getElementById('weekChart')
  if (!bars) return

  const now = new Date()
  const vals = []
  for (let i = 6; i >= 0; i--) {
    const d  = new Date(now.getTime() - i * 86400000)
    const dk = dateKey(d)
    const sum = state.transactions
      .filter(t => t.tgl === dk && t.status !== 'retur')
      .reduce((a, b) => a + b.total, 0)
    vals.push({ d, v: sum })
  }

  const mx = Math.max(...vals.map(x => x.v)) || 1
  bars.innerHTML = vals.map(({ d, v }) => {
    const h  = Math.max(4, Math.round(v / mx * 84))
    const vl = v > 0 ? (v >= 1000 ? Math.round(v / 1000) + 'rb' : v) : ' '
    return `<div class="chart-bar-col">
      <div class="chart-value">${vl}</div>
      <div class="chart-bar" style="height:${h}px" title="${rp(v)}"></div>
      <div class="chart-label">${days[d.getDay()]}</div>
    </div>`
  }).join('')
}

const _renderRecentTrx = () => {
  const el = document.getElementById('recentTrx')
  if (!el) return

  const recent = state.transactions.slice().reverse().slice(0, 5)
  if (!recent.length) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-receipt-off"></i><p>Belum ada transaksi</p></div>`
    return
  }

  el.innerHTML = `<table><thead><tr>
    <th>ID</th><th>Pelanggan</th><th>Total</th><th>Status</th>
  </tr></thead><tbody>` +
    recent.map(t => {
      const sb = t.status === 'retur'
        ? '<span class="badge badge-red">Retur</span>'
        : '<span class="badge badge-green">Selesai</span>'
      return `<tr>
        <td style="font-family:monospace;font-size:11px">${esc(t.id)}</td>
        <td>${esc(t.pelanggan)}</td>
        <td style="font-weight:700;color:var(--green)">${rp(t.total)}</td>
        <td>${sb}</td>
      </tr>`
    }).join('') + '</tbody></table>'
}
