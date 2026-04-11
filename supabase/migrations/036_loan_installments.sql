-- Toplam kredi tutarı + taksit planı satırları
ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_loan_amount NUMERIC(15, 2);

UPDATE loans SET total_loan_amount = remaining_debt WHERE total_loan_amount IS NULL;

ALTER TABLE loans ALTER COLUMN total_loan_amount SET DEFAULT 0;
-- NOT NULL için önce dolduruldu
ALTER TABLE loans ALTER COLUMN total_loan_amount SET NOT NULL;

CREATE TABLE IF NOT EXISTS loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loan_installments_paid_lte_amount CHECK (paid_amount <= amount)
);

CREATE INDEX IF NOT EXISTS idx_loan_installments_loan ON loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_tenant_due ON loan_installments(tenant_id, due_date);

ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select loan_installments"
  ON loan_installments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert loan_installments"
  ON loan_installments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update loan_installments"
  ON loan_installments FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete loan_installments"
  ON loan_installments FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
