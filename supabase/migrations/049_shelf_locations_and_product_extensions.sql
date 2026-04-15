-- Raf yerleri (depo içi konum etiketleri)
CREATE TABLE IF NOT EXISTS shelf_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_shelf_locations_tenant ON shelf_locations(tenant_id);

ALTER TABLE shelf_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shelf locations in their tenant" ON shelf_locations
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert shelf locations for their tenant" ON shelf_locations
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update shelf locations for their tenant" ON shelf_locations
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete shelf locations for their tenant" ON shelf_locations
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Ürün genişletmeleri
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_kind TEXT DEFAULT 'stocked';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_kind_check;
ALTER TABLE products ADD CONSTRAINT products_product_kind_check
  CHECK (product_kind IS NULL OR product_kind IN ('stocked', 'service', 'consulting'));

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtip TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_units JSONB DEFAULT '["adet"]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_location_id UUID REFERENCES shelf_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_shelf_location ON products(shelf_location_id);
