/**
 * Pure stock domain logic — warehouse bazında tek kayıt kullanarak toplam stok hesaplar
 * (yinelenen satırlara karşı tutarlı davranış).
 */
export type StockRecord = {
  warehouse_id?: string | null
  quantity: number | string
  last_updated?: string
}

export function calculateTotalStock(stockRecords?: StockRecord[] | null): number {
  if (!stockRecords?.length) return 0

  const uniqueStockByWarehouse = new Map<string, number>()

  for (const record of stockRecords) {
    const warehouseId = record.warehouse_id || 'default'
    if (!uniqueStockByWarehouse.has(warehouseId)) {
      uniqueStockByWarehouse.set(warehouseId, Number(record.quantity || 0))
    }
  }

  return Array.from(uniqueStockByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
}
