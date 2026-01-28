-- ========================================
-- DUPLICATE STOCK KAYITLARINI TEMİZLE
-- ========================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Önce duplicate kayıtları görelim
SELECT
    product_id,
    warehouse_id,
    COUNT(*) as duplicate_count,
    SUM(quantity) as total_quantity
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- 2. Duplicate kayıtları temizle ve tek kayıtta topla
-- Her product_id + warehouse_id kombinasyonu için sadece 1 kayıt kalacak
DO $$
DECLARE
    rec RECORD;
    total_qty DECIMAL;
BEGIN
    -- Her duplicate grup için
    FOR rec IN
        SELECT product_id, warehouse_id, COUNT(*) as cnt
        FROM stock
        GROUP BY product_id, warehouse_id
        HAVING COUNT(*) > 1
    LOOP
        -- Toplam miktarı hesapla
        SELECT SUM(quantity) INTO total_qty
        FROM stock
        WHERE product_id = rec.product_id
        AND warehouse_id = rec.warehouse_id;

        -- En son kaydı güncelle
        UPDATE stock
        SET quantity = total_qty,
            last_updated = NOW()
        WHERE id = (
            SELECT id FROM stock
            WHERE product_id = rec.product_id
            AND warehouse_id = rec.warehouse_id
            ORDER BY last_updated DESC
            LIMIT 1
        );

        -- Diğer kayıtları sil
        DELETE FROM stock
        WHERE product_id = rec.product_id
        AND warehouse_id = rec.warehouse_id
        AND id != (
            SELECT id FROM stock
            WHERE product_id = rec.product_id
            AND warehouse_id = rec.warehouse_id
            ORDER BY last_updated DESC
            LIMIT 1
        );

        RAISE NOTICE 'Fixed: product_id=%, warehouse_id=%, total_quantity=%',
            rec.product_id, rec.warehouse_id, total_qty;
    END LOOP;
END $$;

-- 3. Sonucu kontrol et - duplicate kalmamalı
SELECT
    product_id,
    warehouse_id,
    COUNT(*) as count
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- 4. UNIQUE constraint'i kontrol et
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'stock'
AND con.contype = 'u';

RAISE NOTICE 'Temizleme tamamlandı!';
