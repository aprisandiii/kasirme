/**
 * trial.js — Sistem Free Trial + Supabase
 *
 * Alur:
 * 1. Saat pertama kali dipakai, generate device_id unik
 * 2. Cek ke Supabase apakah device_id sudah terdaftar
 *    - Belum ada → buat record baru (mulai trial)
 *    - Sudah ada → ambil tanggal mulai & status
 * 3. Hitung sisa hari trial (TRIAL_DAYS dari tanggal mulai)
 * 4. Jika sudah habis & belum upgrade → tampilkan layar terkunci
 *
 * KONFIGURASI:
 * Ganti SUPABASE_URL dan SUPABASE_ANON_KEY di bawah dengan milik Anda.
 */

// ═══════════════════════════════════════════════════
//  KONFIGURASI — GANTI INI DENGAN MILIK ANDA
// ═══════════════════════════════════════════════════
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
const TRIAL_DAYS        = 7   // ubah ke 14 jika ingin 14 hari

// ═══════════════════════════════════════════════════
//  INTERNAL
// ═══════════════════════════════════════════════════
const TABLE = 'trial_users'

/** Hasilkan atau ambil device ID dari localStorage */
function getDeviceId() {
  let id = localStorage.getItem('km_device_id')
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9)
    localStorage.setItem('km_device_id', id)
  }
  return id
}

/** Request helper ke Supabase REST API */
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer':        'return=representation',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error ${res.status}: ${err}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ═══════════════════════════════════════════════════
//  API PUBLIK
// ═══════════════════════════════════════════════════

/**
 * Inisialisasi trial — panggil sekali saat boot.
 * Return: { status, daysLeft, trialStart, deviceId, email }
 *   status: 'active' | 'expired' | 'paid'
 */
export async function initTrial() {
  const deviceId = getDeviceId()

  try {
    // Cari record berdasarkan device_id
    const rows = await supabaseFetch(
      `${TABLE}?device_id=eq.${encodeURIComponent(deviceId)}&select=*`
    )

    let record

    if (!rows || rows.length === 0) {
      // Belum pernah ada → buat baru (mulai trial hari ini)
      const created = await supabaseFetch(TABLE, {
        method: 'POST',
        body: JSON.stringify({
          device_id:   deviceId,
          trial_start: new Date().toISOString(),
          status:      'trial',   // 'trial' | 'paid'
          email:       null,
          plan:        null,
        }),
      })
      record = Array.isArray(created) ? created[0] : created
    } else {
      record = rows[0]
    }

    return buildTrialInfo(record, deviceId)
  } catch (e) {
    console.warn('[Trial] Gagal cek ke Supabase, mode offline:', e.message)
    // Fallback: coba dari localStorage supaya tidak blokir
    return buildOfflineFallback(deviceId)
  }
}

/** Hitung info dari record Supabase */
function buildTrialInfo(record, deviceId) {
  const trialStart = new Date(record.trial_start)
  const now        = new Date()
  // Bandingkan berdasarkan tanggal kalender (UTC) agar tidak terpengaruh
  // selisih jam/timezone yang bisa membuat 'elapsed' lompat 1 hari lebih cepat
  const startUTC = Date.UTC(trialStart.getUTCFullYear(), trialStart.getUTCMonth(), trialStart.getUTCDate())
  const nowUTC   = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const elapsed  = Math.max(0, Math.round((nowUTC - startUTC) / 86400000)) // hari
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsed)
  const isPaid     = record.status === 'paid'

  // Simpan cache lokal
  localStorage.setItem('km_trial_cache', JSON.stringify({
    trialStart: record.trial_start,
    status:     record.status,
    cached_at:  Date.now(),
  }))

  return {
    status:     isPaid ? 'paid' : daysLeft > 0 ? 'active' : 'expired',
    daysLeft,
    trialStart: record.trial_start,
    deviceId,
    email:      record.email || null,
    plan:       record.plan  || null,
  }
}

/** Fallback jika tidak ada koneksi ke Supabase */
function buildOfflineFallback(deviceId) {
  try {
    const cache = JSON.parse(localStorage.getItem('km_trial_cache') || '{}')
    if (cache.trialStart) {
      const trialStart = new Date(cache.trialStart)
      const startUTC = Date.UTC(trialStart.getUTCFullYear(), trialStart.getUTCMonth(), trialStart.getUTCDate())
      const nowD     = new Date()
      const nowUTC   = Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), nowD.getUTCDate())
      const elapsed  = Math.max(0, Math.round((nowUTC - startUTC) / 86400000))
      const daysLeft = Math.max(0, TRIAL_DAYS - elapsed)
      const isPaid     = cache.status === 'paid'
      return {
        status:     isPaid ? 'paid' : daysLeft > 0 ? 'active' : 'expired',
        daysLeft,
        trialStart: cache.trialStart,
        deviceId,
        email:      null,
        plan:       null,
        offline:    true,
      }
    }
  } catch {}
  // Tidak ada cache sama sekali → beri 1 hari grace period
  return { status: 'active', daysLeft: 1, deviceId, offline: true }
}

/**
 * Update email pengguna di Supabase (opsional, untuk identifikasi).
 * Panggil setelah pengguna memasukkan email di layar upgrade.
 */
export async function saveTrialEmail(email) {
  const deviceId = getDeviceId()
  await supabaseFetch(
    `${TABLE}?device_id=eq.${encodeURIComponent(deviceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    }
  )
}

/**
 * Tandai sebagai berbayar (panggil dari webhook payment Anda,
 * atau secara manual dari Supabase dashboard).
 * Untuk testing, Anda bisa panggil fungsi ini langsung di console.
 */
export async function markAsPaid(plan = 'basic') {
  const deviceId = getDeviceId()
  await supabaseFetch(
    `${TABLE}?device_id=eq.${encodeURIComponent(deviceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'paid', plan }),
    }
  )
  // Hapus cache supaya saat refresh baca dari Supabase
  localStorage.removeItem('km_trial_cache')
}

export const getDeviceIdPublic = getDeviceId
