/**
 * Supabase `account_type` enum ile uyumlu değerler: cash | bank | pos | other
 * (Eski Türkçe anahtarlar yalnızca görüntüleme eşlemesinde kullanılır.)
 */
export const ODEME_ICIN_HESAP_TURLERI = ['cash', 'bank', 'pos', 'other'] as const

export function isOdemeHesabi(accountType: string): boolean {
  return (ODEME_ICIN_HESAP_TURLERI as readonly string[]).includes(accountType)
}

/** UI’da hesap türü gösterimi */
export function accountTypeLabel(type: string): string {
  const m: Record<string, string> = {
    cash: 'Kasa',
    bank: 'Banka',
    pos: 'POS',
    other: 'Kredi kartı / diğer',
    // eski / yerel isimler
    kasa: 'Kasa',
    banka: 'Banka',
    kredi_karti: 'Kredi kartı',
    sirket_ortagi: 'Şirket ortağı',
    veresiye: 'Veresiye',
  }
  return m[type] ?? type
}

/** Hesaplarım ekranı bölümleri (accounts.type = DB enum) */
export const HESAP_BOLUMLERI: {
  key: string
  title: string
  types: string[]
  headerTotalTryOnly: boolean
}[] = [
  { key: 'cash', title: 'KASA TANIMLARI', types: ['cash'], headerTotalTryOnly: true },
  { key: 'pos', title: 'POS HESAPLARI', types: ['pos'], headerTotalTryOnly: true },
  { key: 'other', title: 'KREDİ KARTI VE DİĞER', types: ['other'], headerTotalTryOnly: true },
  { key: 'bank', title: 'BANKA HESAPLARI', types: ['bank'], headerTotalTryOnly: true },
]

export function formatAccountBalance(currency: string, balance: number): string {
  const n = Number(balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  if (currency === 'TRY') return `${n} TL`
  if (currency === 'USD') return `USD ${n}`
  if (currency === 'EUR') return `EUR ${n}`
  return `${n} ${currency}`
}
