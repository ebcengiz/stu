-- Çalışan cari hareketleri: signed_amount pozitif = şirketin çalışana borcu artar (tahakkuk),
-- negatif = ödeme / masraf vb. (borç azalır).
CREATE TABLE IF NOT EXISTS employee_cari_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  signed_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_cari_employee ON employee_cari_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_cari_tenant ON employee_cari_transactions(tenant_id);

ALTER TABLE employee_cari_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select employee cari"
  ON employee_cari_transactions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert employee cari"
  ON employee_cari_transactions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update employee cari"
  ON employee_cari_transactions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete employee cari"
  ON employee_cari_transactions FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
