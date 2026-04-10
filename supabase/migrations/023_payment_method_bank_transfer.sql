-- UI / API 'bank_transfer' kullanıyor; enum'da yoksa ödeme insert'leri hata veriyordu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_method'
      AND e.enumlabel = 'bank_transfer'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'bank_transfer';
  END IF;
END
$$;
