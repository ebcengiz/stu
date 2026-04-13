-- Hesap hareketi satırı güncelleme (düzenle)
CREATE POLICY "Tenant can update account ledger"
  ON account_ledger_entries FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
