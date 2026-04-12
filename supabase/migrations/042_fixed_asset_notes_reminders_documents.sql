-- Demirbaş "Not" alanı (detay kartı)
ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Hatırlatma tarihleri (muayene, sigorta, garanti…); sms_send_hour NULL = SMS istenmiyor, 0–23 = gönderim saati
CREATE TABLE IF NOT EXISTS fixed_asset_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  description TEXT,
  sms_send_hour SMALLINT CHECK (sms_send_hour IS NULL OR (sms_send_hour >= 0 AND sms_send_hour <= 23)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_reminders_asset ON fixed_asset_reminders(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_fixed_asset_reminders_tenant_date ON fixed_asset_reminders(tenant_id, reminder_date);

ALTER TABLE fixed_asset_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select fixed_asset_reminders"
  ON fixed_asset_reminders FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert fixed_asset_reminders"
  ON fixed_asset_reminders FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update fixed_asset_reminders"
  ON fixed_asset_reminders FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete fixed_asset_reminders"
  ON fixed_asset_reminders FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Belgeler (kredi belgeleri ile aynı mantık)
CREATE TABLE IF NOT EXISTS fixed_asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_asset_documents_asset ON fixed_asset_documents(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_fixed_asset_documents_tenant ON fixed_asset_documents(tenant_id);

ALTER TABLE fixed_asset_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select fixed_asset_documents"
  ON fixed_asset_documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert fixed_asset_documents"
  ON fixed_asset_documents FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update fixed_asset_documents"
  ON fixed_asset_documents FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete fixed_asset_documents"
  ON fixed_asset_documents FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
