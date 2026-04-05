-- =============================================
-- ALIŞLAR (PURCHASES) VE ALIŞ KALEMLERİ (PURCHASE ITEMS)
-- =============================================

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_no TEXT,
    order_no TEXT,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Bekliyor',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    vat_rate NUMERIC(5,2) DEFAULT 0,
    vat_amount NUMERIC(15,2) DEFAULT 0,
    total_price NUMERIC(15,2) NOT NULL
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's purchases" ON purchases
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create purchases for their tenant" ON purchases
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their tenant's purchases" ON purchases
    FOR UPDATE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their tenant's purchases" ON purchases
    FOR DELETE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's purchase_items" ON purchase_items
    FOR SELECT USING (purchase_id IN (
        SELECT id FROM purchases WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can create purchase_items for their tenant" ON purchase_items
    FOR INSERT WITH CHECK (purchase_id IN (
        SELECT id FROM purchases WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update their tenant's purchase_items" ON purchase_items
    FOR UPDATE USING (purchase_id IN (
        SELECT id FROM purchases WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete their tenant's purchase_items" ON purchase_items
    FOR DELETE USING (purchase_id IN (
        SELECT id FROM purchases WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE INDEX idx_purchases_tenant ON purchases(tenant_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);
