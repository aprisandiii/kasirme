import { storage }  from './storage.js'
import { dateKey }  from '../utils/index.js'

const DEFAULT_SETTINGS = {
  namaToko:   'Toko Saya',
  alamat:     '',
  telp:       '',
  kota:       '',
  footer:     'Terima kasih sudah berbelanja!',
  adminNama:  'Admin',
  username:   'admin',
  password:   'admin123',
  kategori:   ['Makanan','Minuman','Snack','Rokok','ATK','Kebersihan','Elektronik','Lainnya'],
  darkMode:   false,
  sessionTimeout: 30, // menit, 0 = tidak pernah
}

export const state = {
  products:     [],
  transactions: [],
  stokLog:      [],
  nextProdId:   1,
  nextTrxNum:   1,
  settings:     { ...DEFAULT_SETTINGS },
}

export const save = () => storage.save(state)
export const load = async () => {
  state.settings = { ...DEFAULT_SETTINGS }
  await storage.load(state)
}

export const seed = async () => {
  if (state.products.length > 0) return

  const products = [
    { nama: 'Mie Goreng Indomie',   kategori: 'Makanan',    harga: 3500,  modal: 2500,  stok: 48, stokMin: 10, kode: '' },
    { nama: 'Aqua 600ml',           kategori: 'Minuman',    harga: 4000,  modal: 2800,  stok: 72, stokMin: 20, kode: '' },
    { nama: 'Teh Botol Sosro',      kategori: 'Minuman',    harga: 5000,  modal: 3500,  stok: 30, stokMin: 10, kode: '' },
    { nama: 'Oreo Original',        kategori: 'Snack',      harga: 8000,  modal: 6000,  stok: 24, stokMin:  5, kode: '' },
    { nama: 'Pulpen BIC',           kategori: 'ATK',        harga: 3000,  modal: 2000,  stok:  6, stokMin: 10, kode: '' },
    { nama: 'Sampo Pantene Sachet', kategori: 'Kebersihan', harga: 2500,  modal: 1800,  stok: 40, stokMin: 10, kode: '' },
    { nama: 'Gudang Garam Filter',  kategori: 'Rokok',      harga: 24000, modal: 21000, stok: 25, stokMin:  5, kode: '' },
    { nama: 'Chiki Balls',          kategori: 'Snack',      harga: 2000,  modal: 1500,  stok:  3, stokMin:  5, kode: '' },
  ]
  products.forEach(p => state.products.push({ id: state.nextProdId++, ...p }))

  const seedTrx = [
    { pelanggan: 'Budi', items: ['Mie Goreng Indomie','Mie Goreng Indomie','Aqua 600ml'], metode: 'tunai' },
    { pelanggan: 'Sari', items: ['Teh Botol Sosro','Teh Botol Sosro','Oreo Original'],    metode: 'qris'  },
    { pelanggan: 'Umum', items: ['Gudang Garam Filter'],                                  metode: 'tunai' },
  ]

  const now = new Date()
  seedTrx.forEach((s, i) => {
    const d = new Date(now.getTime() - i * 3600000)
    const qMap = {}
    s.items.forEach(n => qMap[n] = (qMap[n] || 0) + 1)
    const snap = []
    Object.entries(qMap).forEach(([n, qty]) => {
      const p = state.products.find(x => x.nama === n)
      if (p) {
        snap.push({ id: p.id, nama: p.nama, qty, harga: p.harga, modal: p.modal || 0, disc: 0 })
        p.stok -= qty
      }
    })
    const total = snap.reduce((a, b) => a + b.qty * b.harga - b.disc, 0)
    state.transactions.push({
      id:        'TRX-' + String(state.nextTrxNum++).padStart(4, '0'),
      waktu:     d.toLocaleString('id-ID'),
      tgl:       dateKey(d),
      pelanggan: s.pelanggan,
      items:     snap,
      total,
      diskon:    0,
      metode:    s.metode,
      status:    'selesai',
    })
  })

  await save()
}

export const addProduct    = async (p) => { state.products.push({ id: state.nextProdId++, ...p }); await save() }
export const updateProduct = async (id, data) => {
  const i = state.products.findIndex(p => p.id === id)
  if (i >= 0) { state.products[i] = { ...state.products[i], ...data }; await save() }
}
export const deleteProduct = async (id) => { state.products = state.products.filter(p => p.id !== id); await save() }
export const findProduct   = (id) => state.products.find(p => p.id === id)

export const addTransaction  = async (trx) => {
  state.transactions.push({ id: 'TRX-' + String(state.nextTrxNum++).padStart(4, '0'), ...trx })
  await save()
}
export const findTransaction = (id) => state.transactions.find(t => t.id === id)
export const voidTransaction = async (id, alasan, catatan) => {
  const t = findTransaction(id)
  if (!t) return false
  t.status       = 'retur'
  t.returAlasan  = alasan
  t.returCatatan = catatan
  t.items.forEach(i => {
    const p = findProduct(i.id)
    if (p) {
      p.stok += i.qty
      addStokLog(p.id, p.nama, i.qty, 'masuk', `Retur transaksi ${id}`)
    }
  })
  await save()
  return true
}

export const addStokLog = (prodId, prodNama, qty, jenis, ket = '') => {
  state.stokLog.unshift({ ts: new Date().toLocaleString('id-ID'), prodId, prodNama, qty, jenis, ket })
  if (state.stokLog.length > 500) state.stokLog = state.stokLog.slice(0, 500)
}

export const updateSettings = async (data) => {
  state.settings = { ...state.settings, ...data }
  await save()
}
