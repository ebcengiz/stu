import { normHeader } from './norm'

export type CariRow = Record<string, unknown>

const CARI_ALIASES: [string, string][] = [
  ['firma adı', 'company_name'],
  ['firma adi', 'company_name'],
  ['ünvan', 'company_name'],
  ['unvan', 'company_name'],
  ['yetkili kişi', 'contact_person'],
  ['yetkili kisi', 'contact_person'],
  ['iletişim', 'contact_person'],
  ['telefon', 'phone'],
  ['e-posta', 'email'],
  ['eposta', 'email'],
  ['email', 'email'],
  ['adres', 'address'],
  ['vergi no', 'tax_number'],
  ['vergi numarası', 'tax_number'],
  ['vergi dairesi', 'tax_office'],
  ['notlar', 'notes'],
  ['müşteri kategorisi', 'category1'],
  ['musteri kategorisi', 'category1'],
  ['kategori', 'category1'],
  ['etiket', 'category2'],
  ['para birimi', 'currency'],
]

export function cariAliasMap(): Map<string, string> {
  const m = new Map<string, string>()
  for (const [a, f] of CARI_ALIASES) {
    m.set(normHeader(a), f)
  }
  return m
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

export function mapCariRow(row: CariRow): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const company_name = cellStr(row.company_name)
  if (!company_name) {
    return { ok: false, error: 'Firma adı boş' }
  }

  const cur = (cellStr(row.currency) || 'TRY').toUpperCase().slice(0, 3) || 'TRY'

  const payload: Record<string, unknown> = {
    company_name,
    contact_person: cellStr(row.contact_person) || null,
    phone: cellStr(row.phone) || null,
    email: cellStr(row.email) || null,
    address: cellStr(row.address) || null,
    tax_number: cellStr(row.tax_number) || null,
    tax_office: cellStr(row.tax_office) || null,
    notes: cellStr(row.notes) || null,
    category1: cellStr(row.category1) || null,
    category2: cellStr(row.category2) || null,
    currency: ['TRY', 'USD', 'EUR'].includes(cur) ? cur : 'TRY',
    is_active: true,
  }

  return { ok: true, payload }
}
