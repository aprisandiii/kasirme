import { state, findProduct, addTransaction, addStokLog, save } from '../modules/state.js'
import { rp, esc, $, openModal, showToast, dateKey }             from '../utils/index.js'
import { renderDashboard } from './dashboard.js'

const CAT_ICONS = {
  Makanan:'ti-bowl-chopsticks', Minuman:'ti-bottle', Snack:'ti-cookie',
  Rokok:'ti-smoking', ATK:'ti-pencil', Kebersihan:'ti-droplet',
  Elektronik:'ti-plug', Lainnya:'ti-package'
}

let cart       = []
let payMethod  = 'tunai'

// ── TILES ─────────────────────────────────────────
export const renderKasirTiles = () => {
  const q = (document.getElementById('searchKasir')?.value || '').toLowerCase()
  const filtered = state.products.filter(p =>
    p.stok > 0 && (
      p.nama.toLowerCase().includes(q) ||
      p.kategori.toLowerCase().includes(q) ||
      (p.kode && p.kode.toLowerCase().includes(q))
    )
  )

  const el = document.getElementById('kasirTiles')
  if (!el) return

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="ti ti-search"></i><p>${q ? 'Produk tidak ditemukan' : 'Tidak ada produk tersedia'}</p>
    </div>`
    return
  }

  el.innerHTML = filtered.map(p => {
    const ic = CAT_ICONS[p.kategori] || 'ti-package'
    return `<div class="produk-tile" onclick="window.__kasirme.addToCart(${p.id})" title="${esc(p.nama)}">
      <div class="produk-tile-icon"><i class="ti ${ic}"></i></div>
      <div class="produk-tile-name">${esc(p.nama)}</div>
      <div class="produk-tile-price">${rp(p.harga)}</div>
      <div class="produk-tile-stok">Stok: ${p.stok}</div>
    </div>`
  }).join('')
}

// ── CART ACTIONS ──────────────────────────────────
export const addToCart = (id) => {
  const p = findProduct(id)
  if (!p) return
  if (p.stok <= 0) { showToast(`⚠️ Stok ${p.nama} habis!`, 'amber'); return }

  const ci = cart.find(c => c.id === id)
  if (ci) {
    if (ci.qty < p.stok) ci.qty++
    else { showToast(`⚠️ Stok ${p.nama} tidak cukup! Tersisa ${p.stok}`, 'amber'); return }
  } else {
    cart.push({ id: p.id, nama: p.nama, harga: p.harga, modal: p.modal || 0, qty: 1, disc: 0 })
  }
  renderCart()
}

export const changeQty = (id, delta) => {
  const p  = findProduct(id)
  const ci = cart.find(c => c.id === id); if (!ci) return
  ci.qty += delta
  if (ci.qty <= 0) {
    cart = cart.filter(c => c.id !== id)
  } else if (p && ci.qty > p.stok) {
    ci.qty = p.stok
    showToast(`⚠️ Stok maksimal ${p.stok}`, 'amber')
  }
  renderCart()
}

export const clearCart = () => {
  cart = []
  const nc = document.getElementById('namaCustomer')
  const dv = document.getElementById('discVal')
  const ud = document.getElementById('uangDiterima')
  if (nc) nc.value = ''
  if (dv) dv.value = ''
  if (ud) ud.value = ''
  renderCart()
}

// ── RENDER CART ───────────────────────────────────
export const renderCart = () => {
  const el = document.getElementById('cartItems')
  if (!el) return

  if (!cart.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 10px">
      <i class="ti ti-shopping-cart-off"></i><p>Keranjang kosong</p>
    </div>`
  } else {
    el.innerHTML = cart.map(c => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${esc(c.nama)}</div>
          ${c.disc > 0 ? `<div class="cart-item-disc">Disc: -${rp(c.disc)}</div>` : ''}
        </div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="window.__kasirme.changeQty(${c.id},-1)">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="window.__kasirme.changeQty(${c.id},1)">+</button>
        </div>
        <div class="cart-item-price">${rp(c.qty * c.harga - c.disc)}</div>
      </div>`
    ).join('')
  }
  renderCartTotals()
  updateCartFab()
}

export const updateCartFab = () => {
  const fab = document.getElementById('cartFab')
  const badge = document.getElementById('cartFabBadge')
  const fabTotal = document.getElementById('cartFabTotal')
  if (!fab) return
  const totalQty = cart.reduce((a, c) => a + c.qty, 0)
  const subtotal = cart.reduce((a, c) => a + c.qty * c.harga, 0)
  if (totalQty > 0) {
    fab.style.display = 'flex'
    if (badge) badge.textContent = totalQty
    if (fabTotal) fabTotal.textContent = subtotal.toLocaleString('id-ID', {style:'currency',currency:'IDR',minimumFractionDigits:0})
  } else {
    fab.style.display = 'none'
  }
}

export const openCartModal = () => {
  const modal = document.getElementById('modalCart')
  if (modal) modal.style.display = 'flex'
}

export const closeCartModal = () => {
  const modal = document.getElementById('modalCart')
  if (modal) modal.style.display = 'none'
}

export const renderCartTotals = () => {
  const subtotal   = cart.reduce((a, c) => a + c.qty * c.harga, 0)
  const itemDisc   = cart.reduce((a, c) => a + c.disc, 0)
  const discVal    = parseFloat(document.getElementById('discVal')?.value) || 0
  const discType   = document.getElementById('discType')?.value || 'nominal'
  const globalDisc = discType === 'persen'
    ? Math.round((subtotal - itemDisc) * discVal / 100)
    : discVal
  const total = Math.max(0, subtotal - itemDisc - globalDisc)

  const subtotalEl = document.getElementById('cartSubtotal')
  const totalEl    = document.getElementById('cartTotal')
  const discRow    = document.getElementById('discRow')
  const discValEl  = document.getElementById('cartDisc')

  if (subtotalEl) subtotalEl.textContent = rp(subtotal)
  if (totalEl)    totalEl.textContent    = rp(total)

  if (discRow) {
    const hasDisc = globalDisc > 0 || itemDisc > 0
    discRow.style.display = hasDisc ? 'flex' : 'none'
    if (discValEl) discValEl.textContent = '-' + rp(itemDisc + globalDisc)
  }
  hitungKembalian()
}

// ── PAYMENT ───────────────────────────────────────
export const setPayMethod = (m) => {
  payMethod = m
  ;['tunai','qris','transfer'].forEach(x => {
    document.getElementById(`pay-${x}`)?.classList.toggle('active', x === m)
  })
  const tunaiArea = document.getElementById('tunaiArea')
  if (tunaiArea) tunaiArea.style.display = m === 'tunai' ? 'block' : 'none'
  const kembalianBox = document.getElementById('kembalianBox')
  if (kembalianBox) kembalianBox.style.display = 'none'
}

export const hitungKembalian = () => {
  const kembalianBox = document.getElementById('kembalianBox')
  if (!kembalianBox || payMethod !== 'tunai') {
    if (kembalianBox) kembalianBox.style.display = 'none'
    return
  }
  const totalStr = document.getElementById('cartTotal')?.textContent || ''
  const total    = parseInt(totalStr.replace(/[^0-9]/g, '')) || 0
  const diterima = parseInt(document.getElementById('uangDiterima')?.value) || 0

  if (diterima > 0) {
    kembalianBox.style.display = 'flex'
    const kembalian = diterima - total
    document.getElementById('kembalianVal').textContent = rp(Math.max(0, kembalian))
    kembalianBox.classList.toggle('kurang', kembalian < 0)
  } else {
    kembalianBox.style.display = 'none'
  }
}

// ── CHECKOUT ──────────────────────────────────────
export const checkout = () => {
  if (!cart.length) { showToast('⚠️ Keranjang kosong!', 'amber'); return }

  // Validasi stok real-time
  const stokErr = []
  cart.forEach(c => {
    const p = findProduct(c.id)
    if (!p || p.stok < c.qty) stokErr.push(`${c.nama} (tersisa ${p ? p.stok : 0})`)
  })
  if (stokErr.length) {
    alert('Stok tidak cukup:\n- ' + stokErr.join('\n- '))
    renderKasirTiles(); renderCart(); return
  }

  // Validasi uang diterima
  if (payMethod === 'tunai') {
    const totalStr = document.getElementById('cartTotal')?.textContent || ''
    const total2   = parseInt(totalStr.replace(/[^0-9]/g, '')) || 0
    const diterima = parseInt(document.getElementById('uangDiterima')?.value) || 0
    if (diterima > 0 && diterima < total2) {
      alert('Uang diterima kurang dari total. Periksa kembali.'); return
    }
  }

  const subtotal   = cart.reduce((a, c) => a + c.qty * c.harga, 0)
  const itemDisc   = cart.reduce((a, c) => a + c.disc, 0)
  const discVal    = parseFloat(document.getElementById('discVal')?.value) || 0
  const discType   = document.getElementById('discType')?.value || 'nominal'
  const globalDisc = discType === 'persen'
    ? Math.round((subtotal - itemDisc) * discVal / 100)
    : discVal
  const total    = Math.max(0, subtotal - itemDisc - globalDisc)
  const pelanggan = document.getElementById('namaCustomer')?.value.trim() || 'Umum'

  const diterima = payMethod === 'tunai'
    ? (parseInt(document.getElementById('uangDiterima')?.value) || 0)
    : 0

  if (!confirm(`Konfirmasi checkout?\nTotal: ${rp(total)}\nMetode: ${payMethod.toUpperCase()}\nPelanggan: ${pelanggan}`)) return

  const snap = cart.map(c => ({
    id: c.id, nama: c.nama, qty: c.qty,
    harga: c.harga, modal: c.modal || 0, disc: c.disc
  }))

  const now = new Date()
  addTransaction({
    waktu:     now.toLocaleString('id-ID'),
    tgl:       dateKey(now),
    pelanggan,
    items:     snap,
    total,
    diskon:    globalDisc + itemDisc,
    metode:    payMethod,
    uangDiterima: diterima,
    status:    'selesai',
  })

  // Kurangi stok
  cart.forEach(c => {
    const p = findProduct(c.id)
    if (p) {
      p.stok -= c.qty
      addStokLog(p.id, p.nama, c.qty, 'keluar', `Terjual - ${state.transactions[state.transactions.length - 1].id}`)
    }
  })

  // Simpan state
  save()

  showStruk(state.transactions[state.transactions.length - 1], diterima)
  closeCartModal()
  clearCart()
  renderKasirTiles()
  renderDashboard()
  showToast('✓ Transaksi berhasil!')
}

// ── STRUK ─────────────────────────────────────────
export const showStruk = (t, uangDiterimaOverride) => {
  const s = state.settings
  const line = '----------------------------------------'
  let txt = `${s.namaToko}\n${s.alamat}\n${s.kota} | Telp: ${s.telp}\n${line}\n`
  txt += `ID     : ${t.id}\nWaktu  : ${t.waktu}\nKasir  : ${s.adminNama || 'Admin'}\n`
  txt += `Plgn   : ${t.pelanggan}\nMetode : ${t.metode.toUpperCase()}\n${line}\n`
  t.items.forEach(i => {
    txt += `${i.nama}\n`
    txt += `  ${i.qty} x ${rp(i.harga)}${i.disc > 0 ? '  disc -' + rp(i.disc) : ''}\n`
    txt += `  = ${rp(i.qty * i.harga - (i.disc || 0))}\n`
  })
  txt += `${line}\n`
  if (t.diskon > 0) txt += `Diskon : -${rp(t.diskon)}\n`
  txt += `TOTAL  : ${rp(t.total)}\n`
  if (t.metode === 'tunai') {
    // Jika dipanggil saat checkout, ambil dari field input; jika dari riwayat, gunakan nilai tersimpan
    const dt = uangDiterimaOverride ?? (parseInt(document.getElementById('uangDiterima')?.value) || 0)
    if (dt > 0) txt += `Terima : ${rp(dt)}\nKembali: ${rp(Math.max(0, dt - t.total))}\n`
  }
  txt += `${line}\n\n${s.footer}\n`

  const strukContent = document.getElementById('strukContent')
  const printArea    = document.getElementById('printArea')
  if (strukContent) strukContent.textContent = txt
  if (printArea)    printArea.textContent    = txt
  openModal('modalStruk')
}

export const printStruk = () => {
  const size = state.settings.paperSize === '58' ? '58' : '80'
  document.body.classList.toggle('paper-58', size === '58')

  // Set ukuran halaman cetak secara dinamis (@page tidak bisa di-nest dalam CSS)
  let styleEl = document.getElementById('dynamicPrintPage')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamicPrintPage'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = `@media print { @page { size: ${size}mm auto; margin: 0; } }`

  window.print()
}
export const getCart    = () => cart
