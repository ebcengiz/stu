-- =============================================
-- SATIŞ KALEMLERİ TABLOSUNA KDV (VAT) ALANLARI EKLEME
-- =============================================

ALTER TABLE sale_items ADD COLUMN vat_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN vat_amount NUMERIC(15,2) DEFAULT 0;
