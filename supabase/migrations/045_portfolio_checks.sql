-- Çek portföyü (müşteriden alınan çeklerin takibi)
CREATE TYPE portfolio_check_status AS ENUM (
  'portfolio',
  'to_supplier',
  'to_bank',
  'paid',
  'bounced',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS portfolio_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_transaction_id UUID REFERENCES customer_transactions(id) ON DELETE SET NULL,
  debtor_name TEXT NOT NULL,
  received_date DATE NOT NULL,
  due_date DATE NOT NULL,
  bank_name TEXT,
  check_number TEXT,
  description TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status portfolio_check_status NOT NULL DEFAULT 'portfolio',
  collection_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  collection_date DATE,
  collection_notes TEXT,
  factoring_tl_amount NUMERIC(15, 2),
  factoring_expense NUMERIC(15, 2),
  factoring_expense_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  factoring_notes TEXT,
  bank_send_bank_name TEXT,
  bank_send_notes TEXT,
  bank_send_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  endorsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_checks_customer_tx
  ON portfolio_checks(customer_transaction_id)
  WHERE customer_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_checks_tenant_status ON portfolio_checks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_portfolio_checks_tenant_due ON portfolio_checks(tenant_id, due_date);

ALTER TABLE portfolio_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select portfolio_checks"
  ON portfolio_checks FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert portfolio_checks"
  ON portfolio_checks FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update portfolio_checks"
  ON portfolio_checks FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete portfolio_checks"
  ON portfolio_checks FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE supplier_transactions
  ADD COLUMN IF NOT EXISTS portfolio_check_id UUID REFERENCES portfolio_checks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_portfolio_check
  ON supplier_transactions(portfolio_check_id)
  WHERE portfolio_check_id IS NOT NULL;
