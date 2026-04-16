'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  Tag,
  Layers,
  Percent,
  ArrowDownRight,
  ArrowRightLeft,
  Warehouse,
  ChevronDown,
  FileText,
  Trash2,
  PlusCircle,
  History,
  ScrollText,
} from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { ManuelStockMovementModal } from '@/components/products/ManuelStockMovementModal'

interface ProductDetail {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  price: number | null
  purchase_price: number | null
  tax_rate: number | null
  discount_rate: number | null
  currency: string
  unit: string
  min_stock_level: number
  is_active: boolean
  category_id: string
  image_url?: string | null
  product_kind?: string | null
  brand?: string | null
  gtip?: string | null
  sale_units?: string[] | null
  shelf_location_id?: string | null
  categories?: { id: string; name: string } | null
  shelf_locations?: { id: string; name: string } | null
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id?: string
    last_updated: string
    warehouses?: {
      id?: string
      name: string
    }
  }>
}

interface LinkedSaleOrPurchase {
  id: string
  document_no: string | null
  created_at: string
  counterparty_name: string
  total_amount: number
  quantity?: number
  unit_price?: number
}

function calculateTotalStock(stockRecords?: Array<{ warehouse_id?: string; quantity: number; last_updated: string }>) {
  if (!stockRecords || stockRecords.length === 0) return 0
  const uniqueByWarehouse = new Map<string, number>()
  stockRecords.forEach((record) => {
    const wid = record.warehouse_id || 'default'
    const qty = Number(record.quantity || 0)
    if (!uniqueByWarehouse.has(wid)) {
      uniqueByWarehouse.set(wid, qty)
    }
  })
  return Array.from(uniqueByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [manualStockModalOpen, setManualStockModalOpen] = useState(false)
  const [accordionOpen, setAccordionOpen] = useState({
    stockActions: false,
    otherActions: false,
  })
  const [previousSales, setPreviousSales] = useState<LinkedSaleOrPurchase[]>([])
  const [previousPurchases, setPreviousPurchases] = useState<LinkedSaleOrPurchase[]>([])
  const [listOpen, setListOpen] = useState({
    sales: true,
    purchases: true,
  })
  const actionMenusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchAll = async () => {
      if (!params?.id) return
      setLoading(true)
      try {
        const [productRes, salesRes, purchasesRes] = await Promise.all([
          fetch(`/api/products/${params.id}`),
          fetch(`/api/products/${params.id}/sales`),
          fetch(`/api/products/${params.id}/purchases`),
        ])

        if (!productRes.ok) throw new Error('Ürün detayları yüklenemedi')
        const productData = await productRes.json()
        setProduct(productData)

        if (salesRes.ok) {
          const salesData = await salesRes.json()
          setPreviousSales(Array.isArray(salesData) ? salesData : [])
        }
        if (purchasesRes.ok) {
          const purchaseData = await purchasesRes.json()
          setPreviousPurchases(Array.isArray(purchaseData) ? purchaseData : [])
        }
      } catch (err: any) {
        toast.error(err.message || 'Ürün detayları yüklenemedi')
        router.push('/dashboard/urunler')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [params?.id, router])

  const reloadProduct = useCallback(async () => {
    if (!params?.id) return
    try {
      const productRes = await fetch(`/api/products/${params.id}`)
      if (!productRes.ok) return
      const productData = await productRes.json()
      setProduct(productData)
    } catch {
      /* sessiz */
    }
  }, [params?.id])

  useEffect(() => {
    if (!accordionOpen.stockActions && !accordionOpen.otherActions) return

    const close = () => setAccordionOpen({ stockActions: false, otherActions: false })

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = actionMenusRef.current
      const target = e.target
      if (!root || !(target instanceof Node)) return
      if (root.contains(target)) return
      close()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (manualStockModalOpen) return
        close()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accordionOpen.stockActions, accordionOpen.otherActions, manualStockModalOpen])

  const totalStock = useMemo(() => calculateTotalStock(product?.stock), [product?.stock])
  const stockValue = useMemo(() => {
    if (!product) return 0
    const price = Number(product.price || 0)
    return price * totalStock
  }, [product, totalStock])

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!product) return null

  const symbol = CURRENCY_SYMBOLS[product.currency || 'TRY'] || product.currency || '₺'

  const infoItems = [
    { label: 'Ürün kodu', value: product.sku },
    { label: 'Kategori', value: product.categories?.name },
    { label: 'Marka', value: product.brand },
    { label: 'KDV oranı', value: `%${product.tax_rate ?? 0}` },
    { label: 'Barkod', value: product.barcode },
    { label: 'Raf yeri', value: product.shelf_locations?.name },
  ].filter((item) => {
    const raw = item.value
    if (raw === null || raw === undefined) return false
    if (typeof raw === 'string') return raw.trim().length > 0
    return true
  })

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-3 pb-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/urunler')}
            className="p-2.5 bg-gray-50 hover:bg-primary-50 text-gray-500 hover:text-primary-600 rounded-xl border border-gray-200 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/urunler')}
            className="h-10 rounded-xl text-sm"
          >
            Ürün listesine dön
          </Button>
        </div>
      </div>

      {/* Ürün künyesi */}
      <Card className="rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm">
        <CardBody className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">
            <div className="w-full md:w-[168px] shrink-0">
              <div className="w-full aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-14 w-14 text-gray-300" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                      {product.name}
                    </h2>
                    {product.is_active ? (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-primary-50 text-primary-600">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-gray-100 text-gray-500">
                        Pasif
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed max-w-3xl">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="px-3 py-2 rounded-xl bg-primary-50/70 border border-primary-100 text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500">
                    Ürün türü
                  </p>
                  <p className="text-sm font-bold text-primary-700">
                    {product.product_kind === 'stocked'
                      ? 'Stoklu ürün'
                      : 'Stoksuz ürün / hizmet'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {infoItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                    <p className="mt-1 text-sm font-bold text-gray-800 break-all">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Özet kutular */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alış Fiyatı</p>
            <p className="text-xl font-black text-gray-900">
              {symbol}
              {Number(product.purchase_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-gray-400" /> {product.unit}
              {' '}başına
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-primary-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wider mb-1">Satış Fiyatı</p>
            <p className="text-xl font-black text-primary-700">
              {symbol}
              {Number(product.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[11px] text-primary-700/80 flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> {product.unit}
              {' '}başına
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStockModalOpen(true)}
            className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm text-left hover:border-primary-300 hover:bg-primary-50/40 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Toplam Stok</p>
                <p className={`text-xl font-black ${totalStock <= (product.min_stock_level || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                  {totalStock.toFixed(2)}{' '}
                  <span className="text-[11px] text-gray-400 uppercase ml-0.5">{product.unit}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary-600">
                <span>Depo detayı</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            {product.min_stock_level > 0 && (
              <p className="mt-1 text-[11px] text-gray-500">
                Kritik seviye: {product.min_stock_level} {product.unit}
              </p>
            )}
          </button>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stok Değeri</p>
            <p className="text-xl font-black text-gray-900">
              {symbol}
              {stockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-gray-400" /> Tüm depolar toplamı
            </p>
          </div>
      </div>

      {/* Action buttons — açılır menüler butonun altında overlay (sayfa düzenini itmez) */}
      <div ref={actionMenusRef} className="relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl text-sm font-bold w-full"
            onClick={() => router.push(`/dashboard/urunler?id=${product.id}&edit=1`)}
          >
            Güncelle
          </Button>

          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() =>
                setAccordionOpen((a) => ({
                  stockActions: !a.stockActions,
                  otherActions: false,
                }))
              }
              className="w-full h-10 flex items-center justify-between gap-2 px-3 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-600 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
            >
              <span className="truncate">Stoklara giriş yap</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${accordionOpen.stockActions ? 'rotate-180' : ''}`} />
            </button>
            {accordionOpen.stockActions && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(280px,50vh)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/10 ring-1 ring-black/5"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAccordionOpen({ stockActions: false, otherActions: false })
                    router.push('/dashboard/tedarikciler')
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  role="menuitem"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <PlusCircle className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="truncate">Tedarikçiden ürün girişi yap</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-gray-400">Alış</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccordionOpen({ stockActions: false, otherActions: false })
                    setManualStockModalOpen(true)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  role="menuitem"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <History className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="truncate">Manuel giriş / çıkış</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccordionOpen({ stockActions: false, otherActions: false })
                    router.push(`/dashboard/urunler/${product.id}/stok-sayimi`)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  role="menuitem"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Warehouse className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="truncate">Stok sayımı</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push(`/dashboard/urunler/${product.id}/stok-ekstresi`)}
            className="w-full h-10 flex items-center justify-center gap-2 px-3 bg-white text-gray-700 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50"
          >
            <ScrollText className="h-4 w-4 text-primary-600 shrink-0" />
            <span className="truncate">Stok ekstresi</span>
          </button>

          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() =>
                setAccordionOpen((a) => ({
                  otherActions: !a.otherActions,
                  stockActions: false,
                }))
              }
              className="w-full h-10 flex items-center justify-between gap-2 px-3 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-600 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
            >
              <span className="truncate">Diğer işlemler</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${accordionOpen.otherActions ? 'rotate-180' : ''}`} />
            </button>
            {accordionOpen.otherActions && (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(280px,50vh)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/10 ring-1 ring-black/5"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAccordionOpen({ stockActions: false, otherActions: false })
                    router.push(`/dashboard/urunler/${product.id}/dokumanlar`)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  role="menuitem"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">Dökümanlar</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  role="menuitem"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="truncate">Etiket yazdır</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-gray-400">Yakında</span>
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
                    try {
                      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
                      if (!res.ok) throw new Error('Ürün silinemedi')
                      toast.success('Ürün silindi')
                      router.push('/dashboard/urunler')
                    } catch (err: any) {
                      toast.error(err.message || 'Ürün silinemedi')
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Ürünü sil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lists: satış + alış yanyana */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-0 px-0">
              <button
                type="button"
                onClick={() => setListOpen((s) => ({ ...s, sales: !s.sales }))}
                className="w-full py-3 px-4 flex items-center justify-between gap-2"
              >
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary-500" /> Önceki satışlar
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${listOpen.sales ? 'rotate-180' : ''}`} />
              </button>
            </CardHeader>
            {listOpen.sales && (
              <CardBody className="p-0">
                <div className="max-h-72 overflow-y-auto">
                  {previousSales.length === 0 ? (
                    <div className="p-4 text-xs text-gray-400 text-center">Bu ürünle ilgili satış kaydı bulunmuyor.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-white sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase">Belge</th>
                          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase">Cari</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Miktar</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Birim Fiyat</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previousSales.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/satislar/${s.id}`)}
                          >
                            <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{s.document_no || s.id.substring(0, 8)}</td>
                            <td className="px-3 py-2.5 text-[11px] text-gray-600 truncate max-w-[180px]">{s.counterparty_name}</td>
                            <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-700">{(s.quantity ?? 0).toLocaleString('tr-TR')} {product.unit}</td>
                            <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-700">{(s.unit_price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold text-gray-800">{s.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardBody>
            )}
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-0 px-0">
              <button
                type="button"
                onClick={() => setListOpen((s) => ({ ...s, purchases: !s.purchases }))}
                className="w-full py-3 px-4 flex items-center justify-between gap-2"
              >
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-emerald-500" /> Önceki alışlar
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${listOpen.purchases ? 'rotate-180' : ''}`} />
              </button>
            </CardHeader>
            {listOpen.purchases && (
              <CardBody className="p-0">
                <div className="max-h-72 overflow-y-auto">
                  {previousPurchases.length === 0 ? (
                    <div className="p-4 text-xs text-gray-400 text-center">Bu ürünle ilgili alış kaydı bulunmuyor.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-white sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase">Belge</th>
                          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase">Tedarikçi</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Miktar</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Birim Fiyat</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black text-gray-400 uppercase">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previousPurchases.map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/alislar/${p.id}`)}
                          >
                            <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{p.document_no || p.id.substring(0, 8)}</td>
                            <td className="px-3 py-2.5 text-[11px] text-gray-600 truncate max-w-[180px]">{p.counterparty_name}</td>
                            <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-700">{(p.quantity ?? 0).toLocaleString('tr-TR')} {product.unit}</td>
                            <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-700">{(p.unit_price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold text-gray-800">{p.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      {/* Stok dağılımı modalı */}
      {stockModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary-50 border border-primary-100">
                  <Warehouse className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Depolara göre stok dağılımı</h3>
                  <p className="text-[11px] text-gray-500">
                    {product.name} — toplam {totalStock.toFixed(2)} {product.unit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronDown className="h-5 w-5 text-gray-500 rotate-180" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(!product.stock || product.stock.length === 0) ? (
                <div className="p-5 text-xs text-gray-400 text-center">
                  Bu ürün için stok kaydı bulunmuyor.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {product.stock.map((s) => (
                    <li key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">
                          {s.warehouses?.name || 'Depo bilgisi yok'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Son güncelleme:{' '}
                          {new Date(s.last_updated).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {Number(s.quantity || 0).toFixed(2)}{' '}
                          <span className="text-[10px] text-gray-400 uppercase ml-0.5">
                            {product.unit}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ManuelStockMovementModal
        open={manualStockModalOpen}
        onClose={() => setManualStockModalOpen(false)}
        productId={product.id}
        productName={product.name}
        productUnit={product.unit}
        currency={product.currency || 'TRY'}
        onSaved={reloadProduct}
      />
    </div>
  )
}

