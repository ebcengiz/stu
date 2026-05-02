import { normHeader } from './norm'
import { parseTrNumberInput } from '@/lib/tr-number-input'

export type ProductRefLists = {
  categories: { id: string; name: string }[]
  warehouses: { id: string; name: string }[]
  shelfLocations: { id: string; name: string }[]
}

export type MappedProductPayload = Record<string, unknown>

const PRODUCT_ALIASES: [string, string][] = [
  ['ürün adı', 'name'],
  ['urun adi', 'name'],
  ['kategori', 'category'],
  ['birim', 'unit'],
  ['barkod', 'barcode'],
  ['sku', 'sku'],
  ['ürün kodu', 'sku'],
  ['satış fiyatı', 'price'],
  ['satis fiyati', 'price'],
  ['alış fiyatı', 'purchase_price'],
  ['alis fiyati', 'purchase_price'],
  ['kdv', 'tax_rate'],
  ['kdv %', 'tax_rate'],
  ['kdv yüzde', 'tax_rate'],
  ['iskonto', 'discount_rate'],
  ['iskonto %', 'discount_rate'],
  ['para birimi', 'currency'],
  ['marka', 'brand'],
  ['raf yeri', 'shelf'],
  ['depo', 'warehouse'],
  ['depo adı', 'warehouse'],
  ['depo adi', 'warehouse'],
  ['başlangıç stok', 'initial_quantity'],
  ['baslangic stok', 'initial_quantity'],
  ['başlangıç miktar', 'initial_quantity'],
  ['minimum stok', 'min_stock_level'],
  ['kritik stok', 'min_stock_level'],
  ['koli içi adet', 'case_inner_qty'],
  ['koli ici adet', 'case_inner_qty'],
  ['ürün tipi', 'product_kind'],
  ['urun tipi', 'product_kind'],
  ['açıklama', 'description'],
  ['aciklama', 'description'],
  ['gtip', 'gtip'],
]

export function productAliasMap(): Map<string, string> {
  const m = new Map<string, string>()
  for (const [alias, field] of PRODUCT_ALIASES) {
    m.set(normHeader(alias), field)
  }
  return m
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function cellNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN
  const n = parseTrNumberInput(String(v))
  return Number.isFinite(n) ? n : NaN
}

function findByName<T extends { id: string; name: string }>(list: T[], raw: string): T | null {
  const q = raw.trim().toLocaleLowerCase('tr-TR')
  if (!q) return null
  return (
    list.find((x) => x.name.trim().toLocaleLowerCase('tr-TR') === q) ||
    list.find((x) => x.name.trim().toLocaleLowerCase('tr-TR').includes(q)) ||
    null
  )
}

function mapProductKind(raw: string): string {
  const k = raw.trim().toLocaleLowerCase('tr-TR')
  if (['hizmet', 'service', 'stoksuz'].includes(k)) return 'service'
  if (['danışmanlık', 'danismanlik', 'consulting'].includes(k)) return 'consulting'
  return 'stocked'
}

export function mapProductRow(
  row: Record<string, unknown>,
  refs: ProductRefLists
): { ok: true; payload: MappedProductPayload } | { ok: false; error: string } {
  const name = cellStr(row.name)
  if (!name) {
    return { ok: false, error: 'Ürün adı boş' }
  }

  const catName = cellStr(row.category)
  let category_id: string | null = null
  if (catName) {
    const c = findByName(refs.categories, catName)
    if (!c) {
      return { ok: false, error: `Kategori bulunamadı: "${catName}"` }
    }
    category_id = c.id
  }

  const unit = cellStr(row.unit) || 'adet'
  const price = cellNum(row.price)
  const purchase_price = cellNum(row.purchase_price)
  const tax_rate = cellNum(row.tax_rate)
  const discount_rate = cellNum(row.discount_rate)
  const initialQty = cellNum(row.initial_quantity)
  const minStock = cellNum(row.min_stock_level)
  const caseInner = cellNum(row.case_inner_qty)

  let warehouse_id: string | null = null
  const whName = cellStr(row.warehouse)
  if (initialQty > 0) {
    if (!whName) {
      return { ok: false, error: 'Başlangıç stoku varsa depo adı zorunludur' }
    }
    const w = findByName(refs.warehouses, whName)
    if (!w) {
      return { ok: false, error: `Depo bulunamadı: "${whName}"` }
    }
    warehouse_id = w.id
  } else if (whName) {
    const w = findByName(refs.warehouses, whName)
    if (w) warehouse_id = w.id
  }

  let shelf_location_id: string | null = null
  const shelfName = cellStr(row.shelf)
  if (shelfName) {
    const s = findByName(refs.shelfLocations, shelfName)
    if (!s) {
      return { ok: false, error: `Raf yeri bulunamadı: "${shelfName}"` }
    }
    shelf_location_id = s.id
  }

  const payload: MappedProductPayload = {
    name,
    category_id,
    unit,
    sku: cellStr(row.sku) || null,
    barcode: cellStr(row.barcode) || null,
    description: cellStr(row.description) || null,
    price: Number.isFinite(price) ? price : 0,
    purchase_price: Number.isFinite(purchase_price) ? purchase_price : 0,
    tax_rate: Number.isFinite(tax_rate) ? tax_rate : 0,
    discount_rate: Number.isFinite(discount_rate) ? discount_rate : 0,
    currency: (cellStr(row.currency) || 'TRY').toUpperCase().slice(0, 3) || 'TRY',
    brand: cellStr(row.brand) || null,
    gtip: cellStr(row.gtip) || null,
    product_kind: mapProductKind(cellStr(row.product_kind)),
    sale_units: [unit],
    shelf_location_id,
    min_stock_level: Number.isFinite(minStock) ? Math.max(0, Math.trunc(minStock)) : 0,
    case_inner_qty:
      Number.isFinite(caseInner) && caseInner > 0 ? Math.trunc(caseInner) : null,
    is_active: true,
    initial_quantity: Number.isFinite(initialQty) && initialQty > 0 ? initialQty : 0,
    warehouse_id: warehouse_id || undefined,
  }

  return { ok: true, payload }
}
