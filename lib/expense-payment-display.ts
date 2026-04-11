/** Masraf listesi «Ödeme» sütunu: ödeme kanalı etiketi */
export function expensePaymentChannelLabel(
  source: 'account' | 'employee' | null,
  accountType: string | null | undefined
): string {
  if (source === 'employee') return 'Nakit'
  const t = String(accountType ?? '').toLowerCase()
  if (t === 'cash' || t === 'kasa') return 'Nakit'
  if (t === 'bank' || t === 'banka') return 'Havale / EFT'
  if (t === 'pos') return 'POS'
  if (t === 'other' || t === 'kredi_karti') return 'Kredi kartı'
  return '—'
}
