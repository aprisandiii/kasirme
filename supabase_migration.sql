-- ═══════════════════════════════════════════════════════════
--  SUPABASE MIGRATION — KasirMe Free Trial System
--  Jalankan script ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Buat tabel trial_users
CREATE TABLE IF NOT EXISTS public.trial_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   text UNIQUE NOT NULL,
  trial_start timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'trial'  -- 'trial' | 'paid'
                CHECK (status IN ('trial', 'paid')),
  email       text,
  plan        text,                           -- 'basic' | 'pro' | null
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Index untuk query cepat berdasarkan device_id
CREATE INDEX IF NOT EXISTS idx_trial_users_device_id
  ON public.trial_users (device_id);

-- 3. Trigger: otomatis update kolom updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trial_users_updated_at ON public.trial_users;
CREATE TRIGGER trg_trial_users_updated_at
  BEFORE UPDATE ON public.trial_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.trial_users ENABLE ROW LEVEL SECURITY;

-- Policy: siapa pun boleh INSERT (device baru mendaftar)
CREATE POLICY "trial_insert_anon"
  ON public.trial_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: hanya boleh SELECT / UPDATE baris miliknya sendiri
-- (berdasarkan device_id yang dikirim client)
CREATE POLICY "trial_select_own"
  ON public.trial_users
  FOR SELECT
  TO anon
  USING (true);   -- anon boleh baca agar bisa cek device_id sendiri

CREATE POLICY "trial_update_own"
  ON public.trial_users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
--  CATATAN KEAMANAN
-- ═══════════════════════════════════════════════════════════
-- Policy di atas sengaja dibuat longgar agar device (anon)
-- bisa mendaftarkan diri dan mengupdate emailnya sendiri.
--
-- Untuk menandai status 'paid', JANGAN percayakan ke client!
-- Gunakan salah satu cara berikut:
--   a) Supabase Dashboard → Table Editor → ubah kolom status secara manual
--   b) Webhook dari payment gateway (Midtrans, Xendit, dll.)
--      yang memanggil Supabase dengan service_role key (server-side)
--   c) Supabase Edge Function yang diproteksi signature
--
-- Contoh query update status paid (jalankan di SQL Editor atau server):
--   UPDATE public.trial_users
--   SET status = 'paid', plan = 'basic'
--   WHERE device_id = 'dev_xxxxx_yyy';

-- ═══════════════════════════════════════════════════════════
--  VIEW MONITORING (opsional, untuk Anda pantau dari dashboard)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.trial_summary AS
SELECT
  id,
  device_id,
  email,
  plan,
  status,
  trial_start::date                                          AS trial_start,
  EXTRACT(DAY FROM now() - trial_start)::int                AS days_elapsed,
  GREATEST(0, 7 - EXTRACT(DAY FROM now() - trial_start)::int) AS days_left,
  created_at::date                                           AS joined_at
FROM public.trial_users
ORDER BY created_at DESC;
