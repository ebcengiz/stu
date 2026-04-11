import type { SupabaseClient } from '@supabase/supabase-js'

export type MasrafGroup = { group: string; items: { value: string; label: string }[] }

/** Sunucuda / API’den gelmeden önce yedek; yeni kiracı seed’i ile aynı içerik */
export const STATIC_MASRAF_GROUPS: MasrafGroup[] = [
  {
    group: 'Araç Giderleri',
    items: [
      { value: 'arac_bakim_onarim', label: 'Bakım/Onarım' },
      { value: 'arac_ceza', label: 'Ceza' },
      { value: 'arac_kasko_sigorta', label: 'Kasko/Sigorta' },
      { value: 'arac_kiralama', label: 'Kiralama' },
      { value: 'arac_muayene', label: 'Muayene' },
      { value: 'arac_vergi', label: 'Vergi' },
      { value: 'arac_yakit', label: 'Yakıt' },
    ],
  },
  {
    group: 'İşletme Giderleri',
    items: [
      { value: 'isletme_aidat', label: 'Aidat' },
      { value: 'isletme_elektrik', label: 'Elektrik' },
      { value: 'isletme_isinma', label: 'Isınma' },
      { value: 'isletme_iletisim', label: 'İletişim' },
      { value: 'isletme_kirtasiye', label: 'Kırtasiye' },
      { value: 'isletme_kira', label: 'Kira' },
      { value: 'isletme_su', label: 'Su' },
      { value: 'isletme_temizlik', label: 'Temizlik' },
    ],
  },
  {
    group: 'Mali Giderler',
    items: [
      { value: 'mali_banka_masraflari', label: 'Banka Masrafları' },
      { value: 'mali_faiz', label: 'Faiz' },
      { value: 'mali_kdv', label: 'KDV' },
      { value: 'mali_kur_farki', label: 'Kur Farkı' },
      { value: 'mali_kurumlar_vergisi', label: 'Kurumlar Vergisi' },
      { value: 'mali_mali_musavir', label: 'Mali Müşavir' },
      { value: 'mali_noter', label: 'Noter' },
      { value: 'mali_stopaj', label: 'Stopaj' },
    ],
  },
  {
    group: 'Personel Giderleri',
    items: [
      { value: 'pers_maas', label: 'Maaş' },
      { value: 'pers_prim', label: 'Prim' },
      { value: 'pers_tazminat', label: 'Tazminat' },
      { value: 'pers_ulasim', label: 'Ulaşım' },
      { value: 'pers_vergi_ssk', label: 'Vergi/SSK' },
      { value: 'pers_yemek', label: 'Yemek' },
    ],
  },
]

/** @deprecated Yerine API’den gelen gruplar kullanılmalı; geriye dönük uyumluluk için STATIC ile aynı */
export const MASRAF_GROUPS = STATIC_MASRAF_GROUPS

const TR_ASCII: Record<string, string> = {
  ğ: 'g',
  ü: 'u',
  ş: 's',
  ı: 'i',
  ö: 'o',
  ç: 'c',
  Ğ: 'g',
  Ü: 'u',
  Ş: 's',
  İ: 'i',
  Ö: 'o',
  Ç: 'c',
}

/** Masraf kalemi teknik anahtarı (tenant içinde benzersiz) */
export function slugifyExpenseItemKey(label: string): string {
  const raw = label
    .trim()
    .split('')
    .map((c) => TR_ASCII[c] ?? c)
    .join('')
  const norm = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  const slug = norm
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  return slug || 'kalem'
}

export function findMasrafLabel(value: string, groups?: MasrafGroup[] | null): string {
  const list = groups?.length ? groups : STATIC_MASRAF_GROUPS
  for (const g of list) {
    const it = g.items.find((i) => i.value === value)
    if (it) return `${g.group} › ${it.label}`
  }
  return value
}

export async function resolveMasrafLabel(
  supabase: SupabaseClient,
  tenantId: string,
  key: string
): Promise<string> {
  const { data } = await supabase
    .from('expense_item_definitions')
    .select('group_name, label')
    .eq('tenant_id', tenantId)
    .eq('item_key', key)
    .maybeSingle()
  if (data) return `${data.group_name} › ${data.label}`
  return findMasrafLabel(key)
}

export type ExpenseItemDefinitionRow = {
  id: string
  tenant_id: string
  group_name: string
  item_key: string
  label: string
  sort_order: number
  created_at?: string
}

/** API’den gelen düz satırları optgroup yapısına çevirir (sıra: grup adı, sort_order, etiket). */
export function expenseDefinitionsToGroups(
  rows: Pick<ExpenseItemDefinitionRow, 'group_name' | 'item_key' | 'label' | 'sort_order'>[]
): MasrafGroup[] {
  const ordered = [...rows].sort((a, b) => {
    const g = a.group_name.localeCompare(b.group_name, 'tr')
    if (g !== 0) return g
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.label.localeCompare(b.label, 'tr')
  })
  const out: MasrafGroup[] = []
  let current: MasrafGroup | null = null
  for (const r of ordered) {
    if (!current || current.group !== r.group_name) {
      current = { group: r.group_name, items: [] }
      out.push(current)
    }
    current.items.push({ value: r.item_key, label: r.label })
  }
  return out
}

export const KDV_ORAN_OPTIONS = ['0', '1', '8', '10', '18', '20'] as const
