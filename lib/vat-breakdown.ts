/** Birim fiyat KDV hariç; satır toplamı KDV dahil (teklif/satış/alış ile uyumlu). */

export function roundMoney(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

export function lineMatrah(line: Pick<{ quantity: number; unit_price: number }, 'quantity' | 'unit_price'>): number {
  return roundMoney(Number(line.quantity) * Number(line.unit_price))
}

export function documentKdvBreakdown(
  lines: { quantity: number; unit_price: number; total_price: number }[],
  documentTotal: number
) {
  const matrah = roundMoney(lines.reduce((s, l) => s + lineMatrah(l), 0))
  const brut = roundMoney(Number(documentTotal))
  const kdv = roundMoney(Math.max(0, brut - matrah))
  return { matrah, kdv, brut }
}
