-- Varsayılan hesap seti: TL Kasa, Banka TL/USD/EUR, POS, Kredi Kartı
-- (021 ile kaldırılan kasa/banka varsayılanları geri; mevcut kiracılarda yalnızca eksik olanlar eklenir)

INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
SELECT t.id, v.acc_name, v.acc_type::account_type, v.acc_currency::currency_type, 0, true
FROM tenants t
CROSS JOIN (
  VALUES
    ('TL Kasa', 'cash', 'TRY'),
    ('Banka TL Hesabı', 'bank', 'TRY'),
    ('Banka USD Hesabı', 'bank', 'USD'),
    ('Banka EUR Hesabı', 'bank', 'EUR'),
    ('POS Hesabı', 'pos', 'TRY'),
    ('Kredi Kartım', 'other', 'TRY')
) AS v(acc_name, acc_type, acc_currency)
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a
  WHERE a.tenant_id = t.id
    AND a.name = v.acc_name
    AND (a.type)::text = v.acc_type
    AND (a.currency)::text = v.acc_currency
);

CREATE OR REPLACE FUNCTION public.seed_default_accounts_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
  VALUES
    (NEW.id, 'TL Kasa', 'cash'::account_type, 'TRY'::currency_type, 0, true),
    (NEW.id, 'Banka TL Hesabı', 'bank'::account_type, 'TRY'::currency_type, 0, true),
    (NEW.id, 'Banka USD Hesabı', 'bank'::account_type, 'USD'::currency_type, 0, true),
    (NEW.id, 'Banka EUR Hesabı', 'bank'::account_type, 'EUR'::currency_type, 0, true),
    (NEW.id, 'POS Hesabı', 'pos'::account_type, 'TRY'::currency_type, 0, true),
    (NEW.id, 'Kredi Kartım', 'other'::account_type, 'TRY'::currency_type, 0, true);
  RETURN NEW;
END;
$$;

-- Kiracıda hesap varken de eksik varsayılanları ekler (canlıda yalnızca POS varken kasa/banka gelmesi için)
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

  INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
  SELECT p_tenant_id, v.acc_name, v.acc_type::account_type, v.acc_currency::currency_type, 0, true
  FROM (
    VALUES
      ('TL Kasa', 'cash', 'TRY'),
      ('Banka TL Hesabı', 'bank', 'TRY'),
      ('Banka USD Hesabı', 'bank', 'USD'),
      ('Banka EUR Hesabı', 'bank', 'EUR'),
      ('POS Hesabı', 'pos', 'TRY'),
      ('Kredi Kartım', 'other', 'TRY')
  ) AS v(acc_name, acc_type, acc_currency)
  WHERE NOT EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.tenant_id = p_tenant_id
      AND a.name = v.acc_name
      AND (a.type)::text = v.acc_type
      AND (a.currency)::text = v.acc_currency
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_accounts(uuid) TO authenticated;
