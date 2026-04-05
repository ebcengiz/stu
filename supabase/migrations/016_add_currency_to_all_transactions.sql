-- =============================================
-- TÜM İŞLEM TABLOLARINA PARA BİRİMİ DESTEĞİ
-- =============================================

-- Satışlar tablosuna ekle
ALTER TABLE sales ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Alışlar tablosuna ekle
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Tedarikçi işlemleri tablosuna ekle
ALTER TABLE supplier_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Cari işlemler tablosuna (garanti olsun diye tekrar)
ALTER TABLE customer_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Ürün kalemlerine de opsiyonel olarak eklenebilir ancak ana tablolar yeterlidir.
