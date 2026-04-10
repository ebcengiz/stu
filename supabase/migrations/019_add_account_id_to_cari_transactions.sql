-- Müşteri / tedarikçi ödemelerini kasa-banka hesaplarına bağlamak için
ALTER TABLE customer_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE supplier_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_transactions_account_id ON customer_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_account_id ON supplier_transactions(account_id);
