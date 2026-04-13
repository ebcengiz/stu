-- Çek portföyü tahsilat / iptal satırlarını hesap defterine bağla
ALTER TABLE account_ledger_entries
  ADD COLUMN IF NOT EXISTS portfolio_check_id UUID REFERENCES portfolio_checks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_portfolio_check
  ON account_ledger_entries(portfolio_check_id)
  WHERE portfolio_check_id IS NOT NULL;

CREATE POLICY "Tenant can delete account ledger"
  ON account_ledger_entries FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
