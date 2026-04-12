-- Projeler (iş kalemleri / şantiye vb.)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_name ON projects(tenant_id, name);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select projects"
  ON projects FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert projects"
  ON projects FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update projects"
  ON projects FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete projects"
  ON projects FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- İşlemlere proje bağlantısı
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE general_expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_project ON purchases(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_project ON sales(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_general_expenses_project ON general_expenses(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE customer_transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE supplier_transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_transactions_project ON customer_transactions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_project ON supplier_transactions(project_id) WHERE project_id IS NOT NULL;
