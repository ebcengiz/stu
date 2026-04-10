-- Canlı DB'de 016 uygulanmamışsa: PostgREST "currency column ... schema cache" hatası
ALTER TABLE supplier_transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';
