-- accounts tablosunun tüm kolonları mevcut olmasını garanti altına alır.
-- Bazı ortamlarda ilk şemadan sonra 018_create_accounts.sql uygulanmadığı için
-- bank_name/iban/credit_limit gibi alanlar eksik kalabiliyor ve API "Could not find
-- the 'bank_name' column of 'accounts'" hatası veriyor.

ALTER TABLE IF EXISTS accounts
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
