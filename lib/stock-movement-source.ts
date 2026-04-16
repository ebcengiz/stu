/** Stok hareketini not / hareket tipine göre işlem çeşidine ayırır (filtreleme ve etiket). */

export type StockMovementSourceKey = 'purchase' | 'sale' | 'manual' | 'inventory' | 'transfer'

const SOURCE_LABELS: Record<StockMovementSourceKey, string> = {
  purchase: 'Alım',
  sale: 'Satım',
  manual: 'Manuel',
  inventory: 'Depo sayımı',
  transfer: 'Depo transferi',
}

export function stockMovementSourceLabel(key: StockMovementSourceKey): string {
  return SOURCE_LABELS[key]
}

export function classifyStockMovementSource(
  movementType: string,
  notes: string | null | undefined
): StockMovementSourceKey {
  const t = String(movementType || '').toLowerCase()
  const n = String(notes ?? '').trim()

  if (t === 'transfer') return 'transfer'
  if (t === 'adjustment') return 'inventory'

  if (n.startsWith('Alış:') || n.includes('Tedarikçi Alımı')) {
    return 'purchase'
  }
  if (n.includes('Müşteri Satışı') || n.includes('Tekliften dönüştürülen satış')) {
    return 'sale'
  }

  return 'manual'
}

export const ALL_STOCK_MOVEMENT_SOURCE_KEYS: StockMovementSourceKey[] = [
  'purchase',
  'sale',
  'manual',
  'inventory',
  'transfer',
]
