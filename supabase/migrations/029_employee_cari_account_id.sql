-- Ödeme satırında kullanılan kasa/banka hesabı
ALTER TABLE employee_cari_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emp_cari_account_id ON employee_cari_transactions(account_id);
