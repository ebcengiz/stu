-- Her işletme için başlangıç POS + kredi kartı hesapları (kasa / banka varsayılanları yok).
-- Idempotent: aynı isimde hesap varsa tekrar eklenmez.
--
-- account_type enum (Supabase): cash | bank | pos | other

INSERT INTO accounts (tenant_id, name, type, currency, balance, is_active)
SELECT t.id, v.acc_name, v.acc_type::account_type, v.acc_currency::currency_type, 0, true
FROM tenants t
CROSS JOIN (
  VALUES
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
    (NEW.id, 'POS Hesabı', 'pos'::account_type, 'TRY'::currency_type, 0, true),
    (NEW.id, 'Kredi Kartım', 'other'::account_type, 'TRY'::currency_type, 0, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_accounts_on_tenant ON tenants;
CREATE TRIGGER trg_seed_default_accounts_on_tenant
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_accounts_for_tenant();

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

GRANT EXECUTE ON FUNCTION public.ensure_default_accounts(uuid) TO authenticated;
