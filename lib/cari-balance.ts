/** Müşteri cari bakiyesi (customers API ile aynı mantık). */
export function customerNetBalance(
  txs: { type: string; amount: number | string; description?: string | null }[]
): number {
  return txs.reduce((acc, tx) => {
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) return acc
    const t = tx.type
    if (t === 'sale' || t === 'invoice') return acc + amt
    if (t === 'payment') return acc - amt
    if (t === 'balance_fix' && String(tx.description || '').includes('BORÇ')) return acc + amt
    if (t === 'balance_fix') return acc - amt
    return acc
  }, 0)
}

/** Tedarikçi cari bakiyesi (pozitif = bize borçlu değil, biz borçluyuz). */
export function supplierNetBalance(txs: { type: string; amount: number | string }[]): number {
  return txs.reduce((acc, tx) => {
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) return acc
    if (tx.type === 'purchase') return acc + amt
    if (tx.type === 'payment') return acc - amt
    return acc
  }, 0)
}
