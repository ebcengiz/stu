-- Manuel para giriş/çıkış ve virman satırları (cari ödemeler customer/supplier_transactions’ta kalır)
CREATE TABLE IF NOT EXISTS account_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('inflow', 'outflow', 'transfer_out', 'transfer_in')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  counterparty_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_ledger_account_id ON account_ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_account_ledger_tenant_id ON account_ledger_entries(tenant_id);

ALTER TABLE account_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view account ledger"
  ON account_ledger_entries FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant can insert account ledger"
  ON account_ledger_entries FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
