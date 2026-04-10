-- Çalışanlar (Nakit Yönetimi > Hesaplarım)
-- Not: Daha önce tenant_id içermeyen bir "employees" tablosu varsa CREATE TABLE IF NOT EXISTS atlanır
-- ve indeks/RLS "column tenant_id does not exist" hatası verir. Bu durumda eski tabloyu kaldırıyoruz.

DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = 'tenant_id'
    ) THEN
      DROP TABLE public.employees CASCADE;
    END IF;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'TRY',
  hire_date DATE,
  leave_date DATE,
  birth_date DATE,
  national_id TEXT,
  monthly_net_salary NUMERIC(15, 2),
  bank_account_no TEXT,
  department TEXT,
  address TEXT,
  bank_details TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant can select employees" ON employees;
DROP POLICY IF EXISTS "Tenant can insert employees" ON employees;
DROP POLICY IF EXISTS "Tenant can update employees" ON employees;
DROP POLICY IF EXISTS "Tenant can delete employees" ON employees;

CREATE POLICY "Tenant can select employees"
  ON employees FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant can insert employees"
  ON employees FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant can update employees"
  ON employees FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant can delete employees"
  ON employees FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
