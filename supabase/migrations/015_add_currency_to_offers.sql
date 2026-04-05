-- =============================================
-- TEKLİFLER TABLOSUNA PARA BİRİMİ EKLEME
-- =============================================

ALTER TABLE offers ADD COLUMN currency TEXT NOT NULL DEFAULT 'TRY';
