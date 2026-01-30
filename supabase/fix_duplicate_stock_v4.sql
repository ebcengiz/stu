-- FIX DUPLICATE STOCK RECORDS (Version 4 - UUID Compatible)
-- Problem: 200 girilen stok 400 olarak görünüyor
-- Cause: Duplicate stock records for same product_id + warehouse_id

-- Step 1: Check current duplicates
SELECT
  product_id,
  warehouse_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(quantity::text, ', ') as quantities
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- Step 2: For each duplicate group, keep only the LATEST record (by last_updated)
-- Delete older records
WITH records_to_keep AS (
  SELECT DISTINCT ON (product_id, warehouse_id)
    id
  FROM stock
  ORDER BY product_id, warehouse_id, last_updated DESC NULLS LAST
)
DELETE FROM stock
WHERE id NOT IN (SELECT id FROM records_to_keep)
AND (product_id, warehouse_id) IN (
  SELECT product_id, warehouse_id
  FROM stock
  GROUP BY product_id, warehouse_id
  HAVING COUNT(*) > 1
);

-- Step 3: Ensure unique constraint exists (prevents future duplicates)
ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_product_warehouse_unique;
ALTER TABLE stock ADD CONSTRAINT stock_product_warehouse_unique
  UNIQUE (product_id, warehouse_id);

-- Step 4: Verify no duplicates remain
SELECT
  product_id,
  warehouse_id,
  COUNT(*) as count
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful
