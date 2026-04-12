-- Proje notları (zaman çizelgesi)
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_tenant ON project_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_created ON project_notes(project_id, created_at DESC);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select project_notes"
  ON project_notes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert project_notes"
  ON project_notes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update project_notes"
  ON project_notes FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete project_notes"
  ON project_notes FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Proje belgeleri (demirbaş belgeleri ile aynı mantık)
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_tenant ON project_documents(tenant_id);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select project_documents"
  ON project_documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert project_documents"
  ON project_documents FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update project_documents"
  ON project_documents FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete project_documents"
  ON project_documents FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
