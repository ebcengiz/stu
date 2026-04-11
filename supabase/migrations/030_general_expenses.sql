-- Genel masraf kayıtları (Masraflar listesi / yeni masraf)
CREATE TABLE IF NOT EXISTS general_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expense_item_key TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  doc_no TEXT,
  description TEXT,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('later', 'paid', 'partial')),
  payment_date DATE,
  amount_gross NUMERIC(15, 2) NOT NULL,
  vat_rate TEXT,
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT 'TRY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_expenses_tenant ON general_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_general_expenses_tx_date ON general_expenses(transaction_date DESC);

ALTER TABLE general_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select general expenses"
  ON general_expenses FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert general expenses"
  ON general_expenses FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update general expenses"
  ON general_expenses FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete general expenses"
  ON general_expenses FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
