-- İsteğe bağlı: bir kolideki birim adedi (etiket / bilgi amaçlı)
ALTER TABLE products ADD COLUMN IF NOT EXISTS case_inner_qty INTEGER CHECK (case_inner_qty IS NULL OR case_inner_qty > 0);

COMMENT ON COLUMN products.case_inner_qty IS 'Koli içi adet (opsiyonel, pozitif tam sayı)';
