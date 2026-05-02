import * as XLSX from 'xlsx'
import type { ProductRefLists } from './productMap'

const PRODUCT_HEADERS = [
  'Ürün Adı',
  'Kategori',
  'Birim',
  'Barkod',
  'SKU',
  'Satış Fiyatı',
  'Alış Fiyatı',
  'KDV %',
  'İskonto %',
  'Para Birimi',
  'Marka',
  'Raf Yeri',
  'Depo Adı',
  'Başlangıç Miktar',
  'Minimum Stok',
  'Koli İçi Adet',
  'Ürün Tipi',
  'Açıklama',
  'GTIP',
]

const CARI_HEADERS = [
  'Firma Adı',
  'Yetkili Kişi',
  'Telefon',
  'E-posta',
  'Adres',
  'Vergi No',
  'Vergi Dairesi',
  'Notlar',
  'Müşteri Kategorisi',
  'Etiket',
  'Para Birimi',
]

export function downloadProductImportTemplate(refs: ProductRefLists, brands: { name?: string }[]) {
  const wb = XLSX.utils.book_new()

  const dataSheet = XLSX.utils.aoa_to_sheet([PRODUCT_HEADERS])
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Ürünler')

  const catRows = [['Kategori Adı (sistemdeki ile aynı yazın)'], ...refs.categories.map((c) => [c.name])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'Kategoriler')

  const whRows = [['Depo Adı'], ...refs.warehouses.map((w) => [w.name])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(whRows), 'Depolar')

  const shRows = [['Raf Yeri'], ...refs.shelfLocations.map((s) => [s.name])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shRows), 'Raf_Yerleri')

  const brRows = [['Marka'], ...brands.map((b) => [b.name || '']).filter((r) => r[0])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(brRows.length > 1 ? brRows : [['Marka'], ['(Tanımlardan)']]), 'Markalar')

  const help = [
    ['Ürün Tipi sütunu: stoklu | hizmet | danışmanlık (boş = stoklu)'],
    ['Başlangıç miktar > 0 ise Depo Adı zorunlu; depo adı bu dosyadaki Depolar sayfasındaki ile birebir eşleşmeli.'],
    ['Kategori boş bırakılabilir; doluysa Kategoriler sayfasındaki bir adla aynı olmalı.'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), 'Yardım')

  XLSX.writeFile(wb, `urun-toplu-import-sablonu.xlsx`)
}

export function downloadCariImportTemplate(
  kind: 'customers' | 'suppliers',
  sampleCategory1: string[],
  sampleCategory2: string[]
) {
  const wb = XLSX.utils.book_new()
  const dataSheet = XLSX.utils.aoa_to_sheet([CARI_HEADERS])
  const sheetName = kind === 'customers' ? 'Müşteriler' : 'Tedarikçiler'
  XLSX.utils.book_append_sheet(wb, dataSheet, sheetName)

  const c1 = [['Örnek Müşteri Kategorileri (referans — istediğiniz metni yazabilirsiniz)'], ...sampleCategory1.slice(0, 50).map((x) => [x])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(c1.length > 1 ? c1 : [['(Boş)']]), 'Ornek_Kategoriler')

  const c2 = [['Örnek Etiketler'], ...sampleCategory2.slice(0, 50).map((x) => [x])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(c2.length > 1 ? c2 : [['(Boş)']]), 'Ornek_Etiketler')

  const help = [
    ['Firma Adı zorunludur.'],
    ['Para Birimi: TRY, USD veya EUR'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), 'Yardım')

  const fname = kind === 'customers' ? 'musteri-toplu-import-sablonu.xlsx' : 'tedarikci-toplu-import-sablonu.xlsx'
  XLSX.writeFile(wb, fname)
}
