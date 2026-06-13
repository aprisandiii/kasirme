import { state, updateSettings, save, seed } from '../modules/state.js'
import { storage }                            from '../modules/storage.js'
import { esc, showToast, $, openModal }       from '../utils/index.js'
import { renderKategoriSelect }               from './produk.js'

export const loadSettingForm = () => {
  const s = state.settings
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val }
  set('settNamaToko',  s.namaToko)
  set('settAlamat',    s.alamat)
  set('settTelp',      s.telp)
  set('settKota',      s.kota)
  set('settFooter',    s.footer)
  set('settAdminNama', s.adminNama || 'Admin')
  set('settUsername',  s.username  || 'admin')
  set('settPassword',  '')
  set('settRecoveryPin', s.recoveryPin || '')
  set('settSessionTimeout', s.sessionTimeout ?? 30)
}

export const saveSetting = () => {
  updateSettings({
    namaToko:  document.getElementById('settNamaToko')?.value  || '',
    alamat:    document.getElementById('settAlamat')?.value    || '',
    telp:      document.getElementById('settTelp')?.value      || '',
    kota:      document.getElementById('settKota')?.value      || '',
    footer:    document.getElementById('settFooter')?.value    || '',
    adminNama: document.getElementById('settAdminNama')?.value.trim() || 'Admin',
  })

  const badge = document.getElementById('userBadge')
  if (badge) badge.textContent = state.settings.adminNama.substring(0, 2).toUpperCase()

  const a = document.getElementById('settingAlert')
  if (a) {
    a.innerHTML = '<div class="alert alert-green"><i class="ti ti-check"></i> Pengaturan disimpan!</div>'
    setTimeout(() => { a.innerHTML = '' }, 3000)
  }
}

export const updateAkun = () => {
  const nama   = document.getElementById('settAdminNama')?.value.trim()
  const uname  = document.getElementById('settUsername')?.value.trim()
  const pass   = document.getElementById('settPassword')?.value
  const pin    = document.getElementById('settRecoveryPin')?.value.trim()

  if (!nama || !uname) { alert('Nama dan username wajib diisi'); return }
  if (pass && pass.length < 6) { alert('Password baru minimal 6 karakter'); return }
  if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
    alert('PIN pemulihan harus 4-6 digit angka'); return
  }

  const updates = { adminNama: nama, username: uname }
  if (pass) updates.password = pass
  if (pin)  updates.recoveryPin = pin
  updateSettings(updates)

  const badge = document.getElementById('userBadge')
  if (badge) badge.textContent = nama.substring(0, 2).toUpperCase()

  showToast('✓ Akun berhasil diperbarui')
}

// ── SESSION TIMEOUT ────────────────────────────────
export const saveSessionTimeout = () => {
  const val = parseInt(document.getElementById('settSessionTimeout')?.value) || 0
  updateSettings({ sessionTimeout: val })
  showToast('✓ Pengaturan sesi disimpan')
}

// ── KATEGORI ──────────────────────────────────────
export const renderKategoriSettings = () => {
  const el = document.getElementById('kategoriList')
  if (!el) return
  el.innerHTML = state.settings.kategori.map((k, i) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="flex:1;font-size:13px">${esc(k)}</span>
      <button class="btn btn-sm btn-danger" onclick="window.__kasirme.hapusKategori(${i})">
        <i class="ti ti-trash"></i>
      </button>
    </div>`
  ).join('')
}

export const tambahKategori = () => {
  const v = document.getElementById('newKatInput')?.value.trim()
  if (!v) return
  if (state.settings.kategori.includes(v)) { alert('Kategori sudah ada'); return }
  const kat = [...state.settings.kategori, v]
  updateSettings({ kategori: kat })
  const inp = document.getElementById('newKatInput')
  if (inp) inp.value = ''
  renderKategoriSettings()
  renderKategoriSelect()
  showToast('✓ Kategori ditambahkan')
}

export const hapusKategori = (i) => {
  const k      = state.settings.kategori[i]
  const inUse  = state.products.some(p => p.kategori === k)
  if (inUse) { alert(`Kategori "${k}" masih digunakan produk, tidak bisa dihapus`); return }
  const kat = state.settings.kategori.filter((_, idx) => idx !== i)
  updateSettings({ kategori: kat })
  renderKategoriSettings()
  renderKategoriSelect()
}

// ── DATA MANAGEMENT ───────────────────────────────
export const exportData = async () => {
  const json = await storage.exportAll(state)
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = `kasirme_backup_${new Date().toISOString().slice(0,10)}.json`
  a.click()
}

export const importData = () => {
  document.getElementById('importFileInput')?.click()
}

export const handleImportFile = (e) => {
  const file = e.target.files[0]; if (!file) return
  const r    = new FileReader()
  r.onload   = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!data.products || !data.transactions) { alert('Format backup tidak valid'); return }
      if (!confirm('Import akan menimpa semua data saat ini. Lanjutkan?')) return
      await storage.importAll(state, ev.target.result)
      loadSettingForm()
      showToast('✓ Data berhasil diimport')
    } catch (err) {
      alert('Gagal membaca file backup: ' + err.message)
    }
  }
  r.readAsText(file)
  e.target.value = ''
}

export const resetData = async () => {
  if (!confirm('Reset SEMUA data? Tidak bisa dibatalkan!')) return
  if (!confirm('Yakin? Ketik OK pada dialog berikutnya untuk konfirmasi terakhir.')) return
  if (!confirm('KONFIRMASI TERAKHIR: Semua produk, transaksi, dan riwayat stok akan dihapus permanen. Lanjutkan?')) return

  await storage.clear()
  state.products      = []
  state.transactions  = []
  state.stokLog       = []
  state.nextProdId    = 1
  state.nextTrxNum    = 1

  await seed()
  showToast('Data direset ke kondisi awal', 'amber')
}
