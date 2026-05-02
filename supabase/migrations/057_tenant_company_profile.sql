-- Firma bilgileri (tenant) — teklif/fatura üst bilgisi ve genel ayarlar

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_title TEXT,
  ADD COLUMN IF NOT EXISTS tax_office TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS mersis_no TEXT,
  ADD COLUMN IF NOT EXISTS trade_registry_no TEXT;

COMMENT ON COLUMN public.tenants.legal_title IS 'Ticari ünvan';
COMMENT ON COLUMN public.tenants.tax_number IS 'Vergi numarası veya T.C. kimlik no (şahıs)';

DROP POLICY IF EXISTS "Tenant admins can update own tenant" ON public.tenants;
CREATE POLICY "Tenant admins can update own tenant"
  ON public.tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::public.user_role
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::public.user_role
    )
  );
