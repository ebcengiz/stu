-- Kredi ile ilişkili yüklenen belgeler (sözleşme, ek belge vb.)
CREATE TABLE IF NOT EXISTS loan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_documents_loan ON loan_documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_tenant ON loan_documents(tenant_id);

ALTER TABLE loan_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select loan_documents"
  ON loan_documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert loan_documents"
  ON loan_documents FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update loan_documents"
  ON loan_documents FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete loan_documents"
  ON loan_documents FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
