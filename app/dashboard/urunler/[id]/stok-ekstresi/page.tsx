'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  ALL_STOCK_MOVEMENT_SOURCE_KEYS,
  stockMovementSourceLabel,
  type StockMovementSourceKey,
} from '@/lib/stock-movement-source'

type MovementRow = {
  id: string
  movement_type: string
  quantity: number
  movement_date: string
  reference_no: string | null
  notes: string | null
  created_by_name: string | null
  warehouses?: { id?: string; name: string } | null
  source_kind: StockMovementSourceKey
}

type ProductBrief = { id: string; name: string; unit: string }

function allKindsSelected(): Record<StockMovementSourceKey, boolean> {
  const o = {} as Record<StockMovementSourceKey, boolean>
  for (const k of ALL_STOCK_MOVEMENT_SOURCE_KEYS) o[k] = true
  return o
}

/** Bugünden geriye doğru yaklaşık son 2 takvim ayı (yerel tarih). */
function getDefaultStokEkstresiRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth() - 2, to.getDate())
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { from: fmt(from), to: fmt(to) }
}

function buildMovementsQuery(
  from: string,
  to: string,
  kindSelected: Record<StockMovementSourceKey, boolean>
): string {
  const sp = new URLSearchParams()
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) sp.set('from', from)
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) sp.set('to', to)
  const kinds = ALL_STOCK_MOVEMENT_SOURCE_KEYS.filter((k) => kindSelected[k])
  if (kinds.length > 0 && kinds.length < ALL_STOCK_MOVEMENT_SOURCE_KEYS.length) {
    sp.set('kinds', kinds.join(','))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function movementTypeLabel(t: string): string {
  switch (String(t || '').toLowerCase()) {
    case 'in':
      return 'Giriş'
    case 'out':
      return 'Çıkış'
    case 'adjustment':
      return 'Düzeltme'
    case 'transfer':
      return 'Transfer'
    default:
      return t || '—'
  }
}

function quantityDisplay(m: MovementRow, unit: string): { text: string; className: string } {
  const q = m.quantity
  const u = unit || 'adet'
  const t = String(m.movement_type || '').toLowerCase()
  if (t === 'in') {
    return { text: `+${q.toLocaleString('tr-TR')} ${u}`, className: 'text-emerald-600' }
  }
  if (t === 'out') {
    return { text: `-${q.toLocaleString('tr-TR')} ${u}`, className: 'text-red-600' }
  }
  if (t === 'adjustment') {
    const sign = q >= 0 ? '+' : ''
    return { text: `${sign}${q.toLocaleString('tr-TR')} ${u}`, className: 'text-amber-700' }
  }
  return { text: `${q.toLocaleString('tr-TR')} ${u}`, className: 'text-gray-800' }
}

export default function UrunStokEkstresiPage() {
  const params = useParams()
  const id = String(params.id ?? '')

  const [product, setProduct] = useState<ProductBrief | null>(null)
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [movementsLoading, setMovementsLoading] = useState(false)

  const [from, setFrom] = useState(() => getDefaultStokEkstresiRange().from)
  const [to, setTo] = useState(() => getDefaultStokEkstresiRange().to)
  const [kindSelected, setKindSelected] = useState<Record<StockMovementSourceKey, boolean>>(allKindsSelected)

  const fetchMovements = useCallback(
    async (
      fromVal: string,
      toVal: string,
      kinds: Record<StockMovementSourceKey, boolean>
    ) => {
      const n = ALL_STOCK_MOVEMENT_SOURCE_KEYS.filter((k) => kinds[k]).length
      if (n === 0) {
        toast.error('En az bir işlem çeşidi seçin')
        return
      }
      setMovementsLoading(true)
      try {
        const qs = buildMovementsQuery(fromVal, toVal, kinds)
        const mRes = await fetch(`/api/products/${id}/stock-movements${qs}`)
        const mJson = await mRes.json().catch(() => ([] as MovementRow[]))
        if (!mRes.ok) {
          throw new Error(
            typeof mJson === 'object' && mJson && 'error' in mJson
              ? String((mJson as { error: string }).error)
              : 'Hareketler yüklenemedi'
          )
        }
        setMovements(Array.isArray(mJson) ? mJson : [])
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Hareketler yüklenemedi')
        setMovements([])
      } finally {
        setMovementsLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const pRes = await fetch(`/api/products/${id}`)
        const pJson = await pRes.json().catch(() => ({}))
        if (!pRes.ok) throw new Error(pJson.error || 'Ürün yüklenemedi')
        if (cancelled) return
        setProduct({
          id: String(pJson.id),
          name: String(pJson.name ?? ''),
          unit: String(pJson.unit ?? 'adet'),
        })
        const range = getDefaultStokEkstresiRange()
        setFrom(range.from)
        setTo(range.to)
        const qs = buildMovementsQuery(range.from, range.to, allKindsSelected())
        const mRes = await fetch(`/api/products/${id}/stock-movements${qs}`)
        const mJson = await mRes.json().catch(() => ([] as MovementRow[]))
        if (!mRes.ok) {
          throw new Error(
            typeof mJson === 'object' && mJson && 'error' in mJson
              ? String((mJson as { error: string }).error)
              : 'Hareketler yüklenemedi'
          )
        }
        if (!cancelled) setMovements(Array.isArray(mJson) ? mJson : [])
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Yüklenemedi')
          setProduct(null)
          setMovements([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const unit = product?.unit ?? 'adet'

  const kindCheckboxes = useMemo(
    () =>
      ALL_STOCK_MOVEMENT_SOURCE_KEYS.map((k) => ({
        key: k,
        label:
          k === 'manual'
            ? 'Manuel giriş/çıkış'
            : k === 'inventory'
              ? 'Depo sayımı'
              : stockMovementSourceLabel(k),
      })),
    []
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-5 overflow-x-hidden pb-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
          <Link
            href={`/dashboard/urunler/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-gray-400" />
            Ürüne dön
          </Link>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
              <ScrollText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Stok ekstresi</p>
              <h1 className="mt-0.5 break-words text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
                {loading ? '…' : product?.name?.trim() || 'Ürün'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-gray-900/5 sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Filtreler</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Başlangıç</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Bitiş</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-semibold text-gray-500">İşlem çeşidi</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {kindCheckboxes.map(({ key, label }) => (
                <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={kindSelected[key]}
                    onChange={(e) => setKindSelected((s) => ({ ...s, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchMovements(from, to, kindSelected)}
              disabled={movementsLoading}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {movementsLoading ? 'Yükleniyor…' : 'Uygula'}
            </button>
            <button
              type="button"
              disabled={movementsLoading}
              onClick={() => {
                const range = getDefaultStokEkstresiRange()
                setFrom(range.from)
                setTo(range.to)
                const all = allKindsSelected()
                setKindSelected(all)
                void fetchMovements(range.from, range.to, all)
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      ) : movements.length === 0 && !movementsLoading ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-10 text-center text-sm text-gray-500">
          Seçilen kriterlere uygun stok hareketi bulunmuyor.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/5">
          {movementsLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Liste güncelleniyor…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Tarih / saat
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      İşlem çeşidi
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Yön
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Depo
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Miktar
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Belge no
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Açıklama
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">
                      İşleyen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m) => {
                    const qd = quantityDisplay(m, unit)
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/60">
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-600">
                          {new Date(m.movement_date).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                          {stockMovementSourceLabel(m.source_kind)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-600">
                          {movementTypeLabel(m.movement_type)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{m.warehouses?.name || '—'}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${qd.className}`}>
                          {qd.text}
                        </td>
                        <td
                          className="max-w-[140px] truncate px-4 py-3 text-xs text-gray-600"
                          title={m.reference_no || ''}
                        >
                          {m.reference_no || '—'}
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-xs text-gray-600">
                          <span className="line-clamp-2">{m.notes?.trim() || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.created_by_name || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
            İlk açılışta son 2 ay gösterilir. Daha eski kayıtlar için başlangıç tarihini geriye alın. En fazla 2.500 satır
            listelenir.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}
