-- Masraf kalemi tanımları (tenant başına; masraf formlarındaki optgroup listesi)
CREATE TABLE IF NOT EXISTS expense_item_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_expense_item_defs_tenant ON expense_item_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_item_defs_group ON expense_item_definitions(tenant_id, group_name);

ALTER TABLE expense_item_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select expense item definitions"
  ON expense_item_definitions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant insert expense item definitions"
  ON expense_item_definitions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant update expense item definitions"
  ON expense_item_definitions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant delete expense item definitions"
  ON expense_item_definitions FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Mevcut tüm kiracılara varsayılan kalemleri kopyala
INSERT INTO expense_item_definitions (tenant_id, group_name, item_key, label, sort_order)
SELECT t.id, v.group_name, v.item_key, v.label, v.sort_order::int
FROM tenants t
CROSS JOIN (
  VALUES
    ('Araç Giderleri', 'arac_bakim_onarim', 'Bakım/Onarım', 0),
    ('Araç Giderleri', 'arac_ceza', 'Ceza', 1),
    ('Araç Giderleri', 'arac_kasko_sigorta', 'Kasko/Sigorta', 2),
    ('Araç Giderleri', 'arac_kiralama', 'Kiralama', 3),
    ('Araç Giderleri', 'arac_muayene', 'Muayene', 4),
    ('Araç Giderleri', 'arac_vergi', 'Vergi', 5),
    ('Araç Giderleri', 'arac_yakit', 'Yakıt', 6),
    ('İşletme Giderleri', 'isletme_aidat', 'Aidat', 0),
    ('İşletme Giderleri', 'isletme_elektrik', 'Elektrik', 1),
    ('İşletme Giderleri', 'isletme_isinma', 'Isınma', 2),
    ('İşletme Giderleri', 'isletme_iletisim', 'İletişim', 3),
    ('İşletme Giderleri', 'isletme_kirtasiye', 'Kırtasiye', 4),
    ('İşletme Giderleri', 'isletme_kira', 'Kira', 5),
    ('İşletme Giderleri', 'isletme_su', 'Su', 6),
    ('İşletme Giderleri', 'isletme_temizlik', 'Temizlik', 7),
    ('Mali Giderler', 'mali_banka_masraflari', 'Banka Masrafları', 0),
    ('Mali Giderler', 'mali_faiz', 'Faiz', 1),
    ('Mali Giderler', 'mali_kdv', 'KDV', 2),
    ('Mali Giderler', 'mali_kur_farki', 'Kur Farkı', 3),
    ('Mali Giderler', 'mali_kurumlar_vergisi', 'Kurumlar Vergisi', 4),
    ('Mali Giderler', 'mali_mali_musavir', 'Mali Müşavir', 5),
    ('Mali Giderler', 'mali_noter', 'Noter', 6),
    ('Mali Giderler', 'mali_stopaj', 'Stopaj', 7),
    ('Personel Giderleri', 'pers_maas', 'Maaş', 0),
    ('Personel Giderleri', 'pers_prim', 'Prim', 1),
    ('Personel Giderleri', 'pers_tazminat', 'Tazminat', 2),
    ('Personel Giderleri', 'pers_ulasim', 'Ulaşım', 3),
    ('Personel Giderleri', 'pers_vergi_ssk', 'Vergi/SSK', 4),
    ('Personel Giderleri', 'pers_yemek', 'Yemek', 5)
) AS v(group_name, item_key, label, sort_order)
ON CONFLICT (tenant_id, item_key) DO NOTHING;
