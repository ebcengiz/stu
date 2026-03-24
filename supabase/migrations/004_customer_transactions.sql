-- Create transaction types
CREATE TYPE transaction_type AS ENUM ('sale', 'payment');

-- =============================================
-- CUSTOMER TRANSACTIONS TABLE
-- =============================================
CREATE TABLE customer_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_customer_transactions_tenant_id ON customer_transactions(tenant_id);
CREATE INDEX idx_customer_transactions_customer_id ON customer_transactions(customer_id);

-- RLS Policies
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions in their tenant"
    ON customer_transactions FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert transactions in their tenant"
    ON customer_transactions FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update transactions in their tenant"
    ON customer_transactions FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete transactions in their tenant"
    ON customer_transactions FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
