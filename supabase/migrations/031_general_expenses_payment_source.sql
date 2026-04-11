-- Masraf ödemesi: kasa/banka vb. hesap veya çalışan cari üzerinden (yalnızca biri)
ALTER TABLE general_expenses
  ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_general_expenses_payment_account ON general_expenses(payment_account_id);
CREATE INDEX IF NOT EXISTS idx_general_expenses_payment_employee ON general_expenses(payment_employee_id);

ALTER TABLE general_expenses DROP CONSTRAINT IF EXISTS general_expenses_payment_source_exclusive;
ALTER TABLE general_expenses ADD CONSTRAINT general_expenses_payment_source_exclusive
  CHECK (payment_account_id IS NULL OR payment_employee_id IS NULL);
