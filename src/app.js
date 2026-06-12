import { state }            from './modules/state.js'
import { doLogout, setOnLoginSuccess, startInactivityWatcher } from './modules/auth.js'
import { todayStr, closeAllModals, showToast } from './utils/index.js'

import { renderDashboard }  from './pages/dashboard.js'
import { renderProdukTable, renderKategoriSelect, openModalTambahProduk,
         editProduk, hapusProduk, simpanProduk, closeModalProduk,
         openImportCSV, previewCSV, importCSV }  from './pages/produk.js'
import { renderKasirTiles, addToCart, changeQty, clearCart,
         renderCart, renderCartTotals, setPayMethod, hitungKembalian,
         checkout, showStruk, printStruk,
         openCartModal, closeCartModal, updateCartFab } from './pages/kasir.js'
import { renderRiwayatTable, lihatStruk,
         openRetur, konfirmasiRetur }             from './pages/riwayat.js'
import { renderLaporan, onPeriodChange,
         switchLaporanTab, exportCSV }            from './pages/laporan.js'
import { renderStokSelect, updateStokInfo,
         simpanPenyesuaianStok, renderStokLog }   from './pages/stok.js'
import { loadSettingForm, saveSetting, updateAkun,
         renderKategoriSettings, tambahKategori, hapusKategori,
         exportData, importData, handleImportFile, resetData,
         saveSessionTimeout }                     from './pages/pengaturan.js'

// ── PAGE MAP ──────────────────────────────────────
const PAGES = {
  dashboard:    { title: 'Dashboard',          onEnter: renderDashboard },
  produk:       { title: 'Produk',             onEnter: () => { renderProdukTable(); renderKategoriSelect() } },
  kasir:        { title: 'Kasir',              onEnter: renderKasirTiles },
  riwayat:      { title: 'Riwayat Transaksi',  onEnter: renderRiwayatTable },
  laporan:      { title: 'Laporan',            onEnter: renderLaporan },
  stok:         { title: 'Manajemen Stok',     onEnter: () => { renderStokSelect(); renderStokLog() } },
  pengaturan:   { title: 'Pengaturan',         onEnter: () => { loadSettingForm(); renderKategoriSettings() } },
}

// ── ROUTER ────────────────────────────────────────
export const gotoPage = (name, el) => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))

  const page = PAGES[name]
  if (!page) {
    // Halaman tidak ditemukan → tampilkan 404 internal
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'))
    document.getElementById('page-notfound')?.classList.remove('hidden')
    document.getElementById('pageTitle').textContent = 'Halaman Tidak Ditemukan'
    return
  }

  el?.classList.add('active')
  document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'))
  document.getElementById(`page-${name}`)?.classList.remove('hidden')

  document.getElementById('pageTitle').textContent = page.title
  page.onEnter?.()
}

// ── INIT APP (called after login) ────────────────
export const initApp = () => {
  document.getElementById('topDate').textContent = todayStr()

  const badge = document.getElementById('userBadge')
  if (badge) badge.textContent = (state.settings.adminNama || 'Admin').substring(0, 2).toUpperCase()

  // Init laporan date fields
  const lHari  = document.getElementById('laporanHari')
  const lBulan = document.getElementById('laporanBulan')
  if (lHari)  lHari.value  = new Date().toISOString().slice(0, 10)
  if (lBulan) lBulan.value = new Date().toISOString().slice(0, 7)

  renderKategoriSelect()
  renderDashboard()
  renderCart()
  loadSettingForm()

  // Notifikasi stok hampir habis saat login
  const low = state.products.filter(p => p.stok <= p.stokMin)
  if (low.length > 0) {
    showToast(`⚠️ ${low.length} produk stok hampir habis / habis`, 'amber')
  }

  // Navigate to dashboard
  gotoPage('dashboard', document.querySelector('.nav-item'))
}

// ── GLOBAL BRIDGE ────────────────────────────────
// Diperlukan karena onclick di innerHTML tidak bisa pakai ES module scope.
// Akan dihilangkan saat migrasi ke framework (React/Vue).
window.__kasirme = {
  ...(window.__kasirme || {}),
  // Auth
  doLogout,
  // Navigation
  gotoPage,
  // Produk
  openModalTambahProduk, editProduk, hapusProduk,
  simpanProduk, closeModalProduk,
  openImportCSV, previewCSV, importCSV,
  renderProdukTable,
  // Kasir
  addToCart, changeQty, clearCart,
  renderCartTotals, setPayMethod, hitungKembalian,
  checkout, renderKasirTiles, printStruk,
  openCartModal, closeCartModal, updateCartFab,
  // Riwayat
  lihatStruk, openRetur, konfirmasiRetur,
  renderRiwayatTable,
  // Laporan
  onPeriodChange, switchLaporanTab, exportCSV, renderLaporan,
  // Stok
  updateStokInfo, simpanPenyesuaianStok,
  // Pengaturan
  saveSetting, updateAkun, tambahKategori, hapusKategori,
  exportData, importData, handleImportFile, resetData,
  saveSessionTimeout,
  closeModal: (id) => document.getElementById(id)?.classList.add('hidden'),
}

// Register callback login → initApp (hindari circular dep)
setOnLoginSuccess(initApp)

// ── KEYBOARD SHORTCUTS ────────────────────────────
document.addEventListener('keydown', e => {
  if (!document.getElementById('appShell') ||
      document.getElementById('appShell').style.display === 'none') return

  if (e.key === 'Escape') closeAllModals()
  if (e.key === 'F2') gotoPage('kasir', document.querySelector('.nav-item:nth-child(3)'))
})
