-- =============================================
-- MÜŞTERİLER TABLOSUNA PARA BİRİMİ EKLENMESİ
-- =============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';
