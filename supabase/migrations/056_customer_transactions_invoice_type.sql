-- Müşteri tarafında "Bakiye Düzeltme" işlemi için frontend
-- type='invoice' (borçlandırma) gönderiyor. Mevcut transaction_type
-- ENUM'u sadece 'sale' ve 'payment' içerdiği için Postgres bu değeri
-- reddediyor ve API "Bakiye düzeltilemedi" hatası dönüyor.
-- Bu migration eksik enum değerlerini güvenle ekler.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'invoice'
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'invoice';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'balance_fix'
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'balance_fix';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
