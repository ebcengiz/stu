-- Genel masraf ile hesap defteri / çalışan cari satırlarını ilişkilendir (silme/iz için)
ALTER TABLE account_ledger_entries
  ADD COLUMN IF NOT EXISTS general_expense_id UUID REFERENCES general_expenses(id) ON DELETE SET NULL;

ALTER TABLE employee_cari_transactions
  ADD COLUMN IF NOT EXISTS general_expense_id UUID REFERENCES general_expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_general_expense ON account_ledger_entries(general_expense_id);
CREATE INDEX IF NOT EXISTS idx_emp_cari_general_expense ON employee_cari_transactions(general_expense_id);
