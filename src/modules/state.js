import { storage }  from './storage.js'

const DEFAULT_SETTINGS = {
  namaToko:   'Toko Saya',
  alamat:     '',
  telp:       '',
  kota:       '',
  footer:     'Terima kasih sudah berbelanja!',
  adminNama:  'Admin',
  username:   'admin',
  password:   'admin123',
  recoveryPin: '0000', // default untuk akun "Lewati" — sarankan diganti
  kategori:   ['Makanan','Minuman','Snack','Rokok','ATK','Kebersihan','Elektronik','Lainnya'],
  darkMode:   false,
  sessionTimeout: 30, // menit, 0 = tidak pernah
  paperSize: '80', // '80' atau '58' (mm), ukuran struk thermal
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
  // Data dummy dihapus — user mulai dari kosong
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
