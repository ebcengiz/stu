CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'kasa', 'banka', 'pos', 'kredi_karti'
  currency TEXT NOT NULL DEFAULT 'TRY', -- 'TRY', 'USD', 'EUR'
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  bank_name TEXT,
  iban TEXT,
  credit_limit DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Policyleri eklenebilir
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant's accounts"
  ON accounts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their own tenant's accounts"
  ON accounts FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own tenant's accounts"
  ON accounts FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their own tenant's accounts"
  ON accounts FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));
