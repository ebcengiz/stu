-- Bazı ortamlarda 016_add_currency_to_all_transactions.sql uygulanmadığı için
-- purchases / sales / supplier_transactions / customer_transactions tablolarında
-- currency kolonu eksik kalıp Supabase "Could not find the 'currency' column"
-- hatası veriyor. Bu migration eksik kolonları güvenle ekler.

ALTER TABLE IF EXISTS purchases
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

ALTER TABLE IF EXISTS sales
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

ALTER TABLE IF EXISTS supplier_transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

ALTER TABLE IF EXISTS customer_transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

NOTIFY pgrst, 'reload schema';
