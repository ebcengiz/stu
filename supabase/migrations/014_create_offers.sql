-- =============================================
-- TEKLİFLER (OFFERS) VE TEKLİF KALEMLERİ (OFFER ITEMS)
-- =============================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    offer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    document_no TEXT,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Beklemede', -- Beklemede, Onaylandı, Reddedildi, İptal
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    quantity NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
    total_price NUMERIC(15,2) NOT NULL
);

-- RLS (Row Level Security) Politikaları - Offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's offers" ON offers
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create offers for their tenant" ON offers
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their tenant's offers" ON offers
    FOR UPDATE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their tenant's offers" ON offers
    FOR DELETE USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS (Row Level Security) Politikaları - Offer Items
ALTER TABLE offer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's offer_items" ON offer_items
    FOR SELECT USING (offer_id IN (
        SELECT id FROM offers WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can create offer_items for their tenant" ON offer_items
    FOR INSERT WITH CHECK (offer_id IN (
        SELECT id FROM offers WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update their tenant's offer_items" ON offer_items
    FOR UPDATE USING (offer_id IN (
        SELECT id FROM offers WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete their tenant's offer_items" ON offer_items
    FOR DELETE USING (offer_id IN (
        SELECT id FROM offers WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- İndeksler
CREATE INDEX idx_offers_tenant ON offers(tenant_id);
CREATE INDEX idx_offers_customer ON offers(customer_id);
CREATE INDEX idx_offer_items_offer ON offer_items(offer_id);
CREATE INDEX idx_offer_items_product ON offer_items(product_id);
