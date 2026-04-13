-- Faktoring masrafı: masraf kalemi + genel masraf kaydı bağlantısı
ALTER TABLE portfolio_checks
  ADD COLUMN IF NOT EXISTS factoring_expense_item_key TEXT,
  ADD COLUMN IF NOT EXISTS factoring_general_expense_id UUID REFERENCES general_expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_checks_factoring_expense
  ON portfolio_checks(tenant_id, factoring_general_expense_id)
  WHERE factoring_general_expense_id IS NOT NULL;
