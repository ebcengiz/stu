import { accountTypeLabel, formatAccountBalance, isOdemeHesabi } from '@/lib/account-sections'

type PaymentAccountLike = {
  id: string
  name: string
  type: string
  currency?: string
  balance?: number | string
  is_active?: boolean
}

type AccountGroup = {
  title: string
  items: PaymentAccountLike[]
}

const GROUP_ORDER: { title: string; keys: string[] }[] = [
  { title: 'Kasa', keys: ['cash', 'kasa'] },
  { title: 'Banka', keys: ['bank', 'banka'] },
  { title: 'POS', keys: ['pos'] },
  { title: 'Diğer', keys: ['other', 'kredi_karti', 'sirket_ortagi', 'veresiye'] },
]

export function isCollectionAccountType(type: string): boolean {
  const t = String(type).toLowerCase()
  return t === 'cash' || t === 'kasa' || t === 'bank' || t === 'banka' || t === 'pos'
}

/** Ödeme çıkışı: POS hesabından para çıkmaz (POS’a tahsilat yatar); kredi kartı ödemesi `other` hesaptan yapılır. */
export function isDisbursementAccountType(type: string): boolean {
  const t = String(type).toLowerCase()
  if (t === 'pos') return false
  return isOdemeHesabi(t)
}

export function groupPaymentAccounts(
  accounts: PaymentAccountLike[],
  opts?: { currency?: string; onlyActive?: boolean; onlyOdeme?: boolean }
): AccountGroup[] {
  const onlyActive = opts?.onlyActive ?? true
  const onlyOdeme = opts?.onlyOdeme ?? true
  const currency = opts?.currency

  const filtered = accounts.filter((a) => {
    if (onlyActive && a.is_active === false) return false
    if (onlyOdeme && !isOdemeHesabi(String(a.type))) return false
    if (currency && String(a.currency || 'TRY') !== String(currency)) return false
    return true
  })

  const used = new Set<string>()
  const groups: AccountGroup[] = GROUP_ORDER.map((g) => {
    const items = filtered.filter((a) => {
      const t = String(a.type).toLowerCase()
      const ok = g.keys.includes(t)
      if (ok) used.add(a.id)
      return ok
    })
    return { title: g.title, items }
  }).filter((g) => g.items.length > 0)

  const rest = filtered.filter((a) => !used.has(a.id))
  if (rest.length > 0) groups.push({ title: 'Diğer hesaplar', items: rest })

  return groups
}

export function formatPaymentAccountOptionLabel(account: PaymentAccountLike): string {
  const type = accountTypeLabel(String(account.type))
  const currency = String(account.currency || 'TRY')
  const balanceNum = Number(account.balance ?? 0)
  const balance = formatAccountBalance(currency, Number.isFinite(balanceNum) ? balanceNum : 0)
  const accountName = String(account.name || '').trim()
  const hasTypePrefix = startsWithTypeLabel(accountName, type)
  const namePart = hasTypePrefix ? accountName : `${type} ${accountName}`.trim()
  return `${namePart} (${balance})`
}

function startsWithTypeLabel(name: string, typeLabel: string): boolean {
  const normalizedName = normalizeForCompare(name)
  const normalizedType = normalizeForCompare(typeLabel)
  if (!normalizedName || !normalizedType) return false
  return normalizedName === normalizedType || normalizedName.startsWith(`${normalizedType} `)
}

function normalizeForCompare(v: string): string {
  return String(v)
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim()
}
