-- =============================================
-- SATIŞLAR (SALES) VE SATIŞ KALEMLERİ (SALE ITEMS)
-- =============================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_no TEXT,
    order_no TEXT,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    collected_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Bekliyor',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL
);

-- RLS (Row Level Security) Politikaları - Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's sales" ON sales
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create sales for their tenant" ON sales
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their tenant's sales" ON sales
    FOR UPDATE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their tenant's sales" ON sales
    FOR DELETE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS (Row Level Security) Politikaları - Sale Items
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's sale_items" ON sale_items
    FOR SELECT USING (sale_id IN (
        SELECT id FROM sales WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can create sale_items for their tenant" ON sale_items
    FOR INSERT WITH CHECK (sale_id IN (
        SELECT id FROM sales WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update their tenant's sale_items" ON sale_items
    FOR UPDATE USING (sale_id IN (
        SELECT id FROM sales WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete their tenant's sale_items" ON sale_items
    FOR DELETE USING (sale_id IN (
        SELECT id FROM sales WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- İndeksler
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
