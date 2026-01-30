-- FIX DUPLICATE STOCK RECORDS (Version 2)
-- Problem: 300 girilen stok 600 olarak görünüyor
-- Cause: Duplicate stock records for same product_id + warehouse_id

-- Step 1: Find duplicates
SELECT
  product_id,
  warehouse_id,
  COUNT(*) as duplicate_count,
  SUM(quantity) as total_quantity
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates, keep the sum
-- For each duplicate group, delete all records and insert one merged record
WITH duplicates AS (
  SELECT
    product_id,
    warehouse_id,
    MIN(id) as keep_id,
    MAX(tenant_id) as tenant_id,
    SUM(quantity::numeric) as total_quantity
  FROM stock
  GROUP BY product_id, warehouse_id
  HAVING COUNT(*) > 1
)
DELETE FROM stock
WHERE (product_id, warehouse_id) IN (
  SELECT product_id, warehouse_id FROM duplicates
);

-- Step 3: Reinsert merged records
WITH duplicates AS (
  SELECT
    product_id,
    warehouse_id,
    MAX(tenant_id) as tenant_id,
    SUM(quantity::numeric) as total_quantity
  FROM stock
  GROUP BY product_id, warehouse_id
  HAVING COUNT(*) > 1
)
INSERT INTO stock (tenant_id, product_id, warehouse_id, quantity, last_updated)
SELECT
  tenant_id,
  product_id,
  warehouse_id,
  total_quantity,
  NOW()
FROM duplicates;

-- Step 4: Ensure unique constraint exists
-- Drop existing constraint if any
ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_product_warehouse_unique;

-- Add unique constraint
ALTER TABLE stock ADD CONSTRAINT stock_product_warehouse_unique
  UNIQUE (product_id, warehouse_id);

-- Step 5: Verify no duplicates remain
SELECT
  product_id,
  warehouse_id,
  COUNT(*) as count
FROM stock
GROUP BY product_id, warehouse_id
HAVING COUNT(*) > 1;

-- Should return 0 rows if successful
