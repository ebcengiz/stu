-- Create payment method type
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'cheque');

-- Add new columns to customer_transactions
ALTER TABLE customer_transactions ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- Create customer_transaction_items for sales tracking
CREATE TABLE customer_transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES customer_transactions(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL, -- Keep name in case product is deleted
    quantity DECIMAL(15, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for items
ALTER TABLE customer_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transaction items in their tenant"
    ON customer_transaction_items FOR SELECT
    USING (transaction_id IN (
        SELECT id FROM customer_transactions WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert transaction items in their tenant"
    ON customer_transaction_items FOR INSERT
    WITH CHECK (transaction_id IN (
        SELECT id FROM customer_transactions WHERE tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    ));
