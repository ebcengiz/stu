-- TL Kasa ve Banka TL/USD/EUR varsayılan hesaplarını kaldır (yinelenen / istenmeyen).
-- Cari satırlarındaki account_id bu hesaplara bağlıysa ON DELETE SET NULL ile temizlenir.

DELETE FROM accounts
WHERE name IN (
  'TL Kasa',
  'Banka TL Hesabı',
  'Banka USD Hesabı',
  'Banka EUR Hesabı'
);

-- Yeni tenant / boş kiracı için artık yalnızca POS + Kredi Kartı oluşturulsun
CREATE OR REPLACE FUNCTION public.seed_default_accounts_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
  VALUES
    (NEW.id, 'POS Hesabı', 'pos'::account_type, 'TRY'::currency_type, 0, true),
    (NEW.id, 'Kredi Kartım', 'other'::account_type, 'TRY'::currency_type, 0, true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_accounts(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Bu işletme için yetkiniz yok';
  END IF;
  IF EXISTS (SELECT 1 FROM accounts WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;
  INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
  VALUES
    (p_tenant_id, 'POS Hesabı', 'pos'::account_type, 'TRY'::currency_type, 0, true),
    (p_tenant_id, 'Kredi Kartım', 'other'::account_type, 'TRY'::currency_type, 0, true);
END;
$$;
