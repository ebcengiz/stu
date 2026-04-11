-- Kredi tanımları (Nakit Yönetimi > Krediler)
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  remaining_debt NUMERIC(15, 2) NOT NULL DEFAULT 0,
  remaining_installments INT NOT NULL DEFAULT 0 CHECK (remaining_installments >= 0 AND remaining_installments <= 144),
  next_installment_date DATE,
  payment_schedule TEXT NOT NULL DEFAULT 'monthly'
    CHECK (payment_schedule IN (
      'monthly',
      'every_2_months',
      'every_3_months',
      'every_4_months',
      'every_6_months',
      'yearly'
    )),
  payment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT,
  currency TEXT NOT NULL DEFAULT 'TRY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_tenant ON loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_next_date ON loans(tenant_id, next_installment_date);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select loans"
  ON loans FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert loans"
  ON loans FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update loans"
  ON loans FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete loans"
  ON loans FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
