'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, AlertCircle, BarChart3 } from 'lucide-react'
import FixedAssetModal, { type FixedAssetModalValues } from '@/components/fixed-assets/FixedAssetModal'

type AssetRow = {
  id: string
  name: string
  description: string | null
  serial_no: string | null
  purchase_date: string | null
  price: number | string | null
  notes?: string | null
  currency: string
}

function formatMoney(n: number | string | null | undefined, cur: string) {
  if (n == null || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('tr-TR')
}

export default function DemirbaslarPage() {
  const router = useRouter()
  const [rows, setRows] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<FixedAssetModalValues | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/fixed-assets')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Yüklenemedi')
      setRows(Array.isArray(j.assets) ? j.assets : [])
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setModalInitial(null)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Demirbaşlar</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Demirbaş Ekle
          </button>
          <Link
            href="/dashboard/hesaplarim/demirbaslar/rapor"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-200 hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Rapor
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}

      {!loading && rows.length === 0 && !loadError && (
        <div className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
            <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 text-sm leading-relaxed text-amber-950">
            <p className="font-semibold text-amber-950">Henüz demirbaş kaydı yok.</p>
            <p className="mt-1 text-amber-900/90">
              Araç, telefon, bilgisayar gibi şirket varlıklarınızı burada kaydedebilir; fatura, garanti belgesi gibi
              dosyaları ileride ekleyebilir ve muayene veya sigorta hatırlatıcı tarihleri tanımlayabilirsiniz.
            </p>
            <p className="mt-2 text-amber-900/85">
              <button
                type="button"
                onClick={openCreate}
                className="mr-1 inline-flex align-middle items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Demirbaş Ekle
              </button>
              düğmesini veya sayfa üstündeki aynı adlı düğmeyi kullanarak kayda başlayabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <p className="border-b border-gray-100 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-500">
            Satıra tıklayarak detay, hatırlatma ve dökümanlara gidebilirsiniz.
          </p>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[560px] table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-left text-xs font-bold uppercase tracking-wide text-white">
                  <th className="px-3 py-2.5">Demirbaş adı</th>
                  <th className="px-3 py-2.5">Seri / plaka</th>
                  <th className="px-3 py-2.5">Alış tarihi</th>
                  <th className="px-3 py-2.5">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/hesaplarim/demirbaslar/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/dashboard/hesaplarim/demirbaslar/${r.id}`)
                      }
                    }}
                    className={`cursor-pointer border-b border-gray-100 transition hover:bg-gray-100 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{r.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.serial_no?.trim() || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{formatDate(r.purchase_date)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{formatMoney(r.price, r.currency || 'TRY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Yükleniyor…</p>}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <FixedAssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalInitial}
        onSaved={load}
      />
    </div>
  )
}
