-- Duplicate stock kayıtlarını temizle
-- Her product_id ve warehouse_id kombinasyonu için en son kaydı tut
DELETE FROM stock a USING stock b 
WHERE a.id < b.id 
AND a.product_id = b.product_id 
AND a.warehouse_id = b.warehouse_id;

-- Quantity'leri topla ve tek kayda indir
WITH stock_sums AS (
  SELECT 
    product_id, 
    warehouse_id, 
    SUM(quantity) as total_quantity,
    MAX(tenant_id) as tenant_id,
    MAX(last_updated) as last_updated
  FROM stock
  GROUP BY product_id, warehouse_id
  HAVING COUNT(*) > 1
)
UPDATE stock s
SET quantity = ss.total_quantity
FROM stock_sums ss
WHERE s.product_id = ss.product_id 
AND s.warehouse_id = ss.warehouse_id;
