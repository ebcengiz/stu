'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Package } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { looseToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'

type WarehouseRow = { id: string; name: string }

type ProductPayload = {
  id: string
  name: string
  sku: string | null
  unit: string
  image_url?: string | null
  tax_rate: number | null
  purchase_price: number | null
  currency: string
  categories?: { name: string } | null
  brand?: string | null
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id?: string
    warehouses?: { name: string }
  }>
}

type MergedRow = {
  warehouse_id: string
  warehouse_name: string
  system_qty: number
}

export default function StokSayimiPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id ?? '')

  const [product, setProduct] = useState<ProductPayload | null>(null)
  const [rows, setRows] = useState<MergedRow[]>([])
  const [countedByWh, setCountedByWh] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatePurchasePrice, setUpdatePurchasePrice] = useState(false)
  const [purchasePriceStr, setPurchasePriceStr] = useState('')

  const symbol = useMemo(
    () => CURRENCY_SYMBOLS[product?.currency || 'TRY'] || product?.currency || '\u20BA',
    [product?.currency]
  )

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [pRes, wRes] = await Promise.all([fetch(`/api/products/${id}`), fetch('/api/warehouses')])
      const pJson = await pRes.json().catch(() => ({}))
      const wJson = await wRes.json().catch(() => [])
      if (!pRes.ok) throw new Error(pJson.error || 'Ürün yüklenemedi')
      if (!wRes.ok) throw new Error('Depolar yüklenemedi')

      setProduct(pJson as ProductPayload)
      const warehouses: WarehouseRow[] = Array.isArray(wJson) ? wJson : []
      const stock = Array.isArray(pJson.stock) ? pJson.stock : []

      const merged: MergedRow[] = warehouses.map((w) => {
        const line = stock.find(
          (s: { warehouse_id?: string; quantity: number }) => s.warehouse_id === w.id
        )
        const system_qty = Number(line?.quantity ?? 0)
        return {
          warehouse_id: w.id,
          warehouse_name: w.name,
          system_qty,
        }
      })

      setRows(merged)
      const init: Record<string, string> = {}
      merged.forEach((r) => {
        init[r.warehouse_id] = looseToTrInputString(r.system_qty, 4)
      })
      setCountedByWh(init)
      setPurchasePriceStr(looseToTrInputString(pJson.purchase_price ?? '', 4))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Yüklenemedi')
      setProduct(null)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!product) return
    const bodyRows: { warehouse_id: string; counted_quantity: number }[] = []
    for (const r of rows) {
      const raw = countedByWh[r.warehouse_id] ?? ''
      const n = parseTrNumberInput(raw)
      if (!Number.isFinite(n)) {
        toast.error(`${r.warehouse_name} için geçerli bir miktar girin`)
        return
      }
      bodyRows.push({ warehouse_id: r.warehouse_id, counted_quantity: n })
    }

    let purchase_price: number | undefined
    if (updatePurchasePrice) {
      const p = parseTrNumberInput(purchasePriceStr)
      if (!Number.isFinite(p) || p < 0) {
        toast.error('Geçerli birim maliyet girin')
        return
      }
      purchase_price = p
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/products/${id}/stock-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: bodyRows,
          ...(updatePurchasePrice ? { purchase_price } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success('Stok sayımı kaydedildi')
      router.push(`/dashboard/urunler/${id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-gray-500">
        Ürün bulunamadı.{' '}
        <Link href="/dashboard/urunler" className="font-semibold text-primary-600 hover:underline">
          Listeye dön
        </Link>
      </div>
    )
  }

  const title = `${product.sku ? `(${product.sku}) ` : ''}${product.name}`

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl text-sm font-bold"
          onClick={() => router.push(`/dashboard/urunler/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Geri dön
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-10 gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold hover:bg-primary-700"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-white shadow-sm">
              <p className="text-sm font-bold leading-snug sm:text-base">{title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.categories?.name ? (
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-800 ring-1 ring-primary-100">
                  {product.categories.name}
                </span>
              ) : null}
              {product.brand?.trim() ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                  {product.brand.trim()}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-amber-100">
                KDV %{Number(product.tax_rate ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 sm:h-32 sm:w-32">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-12 w-12 text-gray-300" />
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-amber-100 bg-amber-50/90 px-4 py-4 sm:px-5">
          <p className="text-sm leading-relaxed text-amber-950">
            Aşağıda kayıtlı depolarınızdaki ve seçtiğiniz ürüne ait güncel stok bilgileri yer alır. Listede sayılan
            miktarı değiştirip kaydettiğinizde stoklarınız güncellenir.
          </p>
          <p className="mt-3 text-sm font-semibold text-amber-900">
            Dikkat! Ürünün cari birim maliyeti{' '}
            <span className="tabular-nums">
              {product.purchase_price != null && Number.isFinite(Number(product.purchase_price))
                ? `${Number(product.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${symbol}`
                : '—'}
            </span>{' '}
            olarak kayıtlıdır. Sayım ile birlikte birim maliyeti güncellemek için{' '}
            <button
              type="button"
              onClick={() => setUpdatePurchasePrice((v) => !v)}
              className="font-bold text-primary-700 underline decoration-primary-400 underline-offset-2 hover:text-primary-800"
            >
              tıklayın
            </button>
            .
          </p>
          {updatePurchasePrice ? (
            <div className="mt-4 flex max-w-md flex-col gap-2 rounded-xl border border-amber-200/80 bg-white/80 p-3">
              <label className="text-xs font-semibold text-gray-600">Yeni birim maliyet (KDV hariç)</label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                <span className="flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">
                  {symbol}
                </span>
                <TrNumberInput
                  value={purchasePriceStr}
                  onChange={setPurchasePriceStr}
                  className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">Tanımlı depo bulunmuyor.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-primary-50/90">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-primary-900">
                    Bulunduğu depo
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-primary-900">
                    Sistemdeki miktar
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-primary-900">
                    Sayılan miktar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((r) => (
                  <tr key={r.warehouse_id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-800">{r.warehouse_name}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {r.system_qty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                      <span className="ml-1 text-[11px] text-gray-400">{product.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TrNumberInput
                        value={countedByWh[r.warehouse_id] ?? ''}
                        onChange={(v) => setCountedByWh((prev) => ({ ...prev, [r.warehouse_id]: v }))}
                        className="ml-auto w-full max-w-[200px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm font-semibold tabular-nums text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:max-w-[240px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}
