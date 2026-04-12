'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  CalendarPlus,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import FixedAssetModal, { type FixedAssetModalValues } from '@/components/fixed-assets/FixedAssetModal'
import ReminderModal, { type ReminderFormValues } from '@/components/fixed-assets/ReminderModal'

type AssetData = {
  id: string
  name: string
  description: string | null
  serial_no: string | null
  purchase_date: string | null
  price: number | string | null
  notes: string | null
  currency: string
}

type ReminderRow = {
  id: string
  reminder_date: string
  description: string | null
  sms_send_hour: number | null
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
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('tr-TR')
}

function assetToModal(a: AssetData): FixedAssetModalValues {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? '',
    serial_no: a.serial_no ?? '',
    purchase_date: a.purchase_date ? String(a.purchase_date).slice(0, 10) : '',
    price: a.price != null && a.price !== '' ? String(a.price).replace('.', ',') : '',
    notes: a.notes ?? '',
  }
}

function reminderToForm(r: ReminderRow): ReminderFormValues {
  return {
    id: r.id,
    reminder_date: String(r.reminder_date).slice(0, 10),
    description: r.description ?? '',
    sms_send_hour: r.sms_send_hour != null ? String(r.sms_send_hour) : '',
  }
}

export default function DemirbasDetayPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id ?? '')

  const [asset, setAsset] = useState<AssetData | null>(null)
  const [reminders, setReminders] = useState<ReminderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderInitial, setReminderInitial] = useState<ReminderFormValues | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    try {
      const [rAsset, rRem] = await Promise.all([
        fetch(`/api/fixed-assets/${id}`),
        fetch(`/api/fixed-assets/${id}/reminders`),
      ])
      const jA = await rAsset.json().catch(() => ({}))
      const jR = await rRem.json().catch(() => ({}))
      if (!rAsset.ok) throw new Error(jA.error || 'Yüklenemedi')
      if (!rRem.ok) throw new Error(jR.error || 'Hatırlatmalar yüklenemedi')
      setAsset(jA.asset ?? null)
      setReminders(Array.isArray(jR.reminders) ? jR.reminders : [])
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi')
      setAsset(null)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openEditAsset = () => {
    if (!asset) return
    setAssetModalOpen(true)
  }

  const confirmDeleteAsset = () => {
    if (!asset) return
    toast.custom(
      (t) => (
        <div className="pointer-events-auto max-w-sm rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
          <p className="text-sm font-semibold text-slate-900">Bu demirbaşı silmek istiyor musunuz?</p>
          <p className="mt-1 text-xs text-slate-600">{asset.name}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDeleteAsset()
              }}
            >
              Sil
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    )
  }

  const performDeleteAsset = async () => {
    try {
      const res = await fetch(`/api/fixed-assets/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Demirbaş silindi')
      router.push('/dashboard/hesaplarim/demirbaslar')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const openNewReminder = () => {
    setReminderInitial(null)
    setReminderModalOpen(true)
  }

  const openEditReminder = (r: ReminderRow) => {
    setReminderInitial(reminderToForm(r))
    setReminderModalOpen(true)
  }

  const deleteReminder = async (r: ReminderRow) => {
    try {
      const res = await fetch(`/api/fixed-assets/${id}/reminders/${r.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Hatırlatma silindi')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Yükleniyor…</p>
  }

  if (loadError || !asset) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{loadError || 'Kayıt yok'}</p>
        <Link href="/dashboard/hesaplarim/demirbaslar" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Demirbaşlara dön
        </Link>
      </div>
    )
  }

  const cur = asset.currency || 'TRY'

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <Link
        href="/dashboard/hesaplarim/demirbaslar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Demirbaşlara dön
      </Link>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="bg-[#1e3a5f] px-3 py-2">
          <h1 className="text-sm font-bold uppercase tracking-wide text-white">{asset.name}</h1>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <div className="flex justify-between gap-3 text-sm sm:col-span-2">
            <span className="shrink-0 text-right font-medium text-slate-500">Açıklama</span>
            <span className="min-w-0 whitespace-pre-wrap text-left text-slate-800">{asset.description?.trim() || '—'}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Seri / plaka</span>
            <span className="text-left font-semibold text-slate-900">{asset.serial_no?.trim() || '—'}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Alış tarihi</span>
            <span className="text-left font-semibold text-slate-900">{formatDate(asset.purchase_date)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Fiyatı</span>
            <span className="text-left font-semibold text-slate-900">{formatMoney(asset.price, cur)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm sm:col-span-2">
            <span className="shrink-0 text-right font-medium text-slate-500">Not</span>
            <span className="min-w-0 whitespace-pre-wrap text-left text-slate-800">{asset.notes?.trim() || '—'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openEditAsset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm hover:bg-sky-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Güncelle
        </button>
        <button
          type="button"
          onClick={openNewReminder}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Hatırlatma Tarihi Ekle
        </button>
        <button
          type="button"
          onClick={confirmDeleteAsset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Demirbaşı Sil
        </button>
        <Link
          href={`/dashboard/hesaplarim/demirbaslar/${id}/dokumanlar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 shadow-sm hover:bg-violet-100"
        >
          <FileText className="h-3.5 w-3.5" />
          Dökümanlar
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="border-b border-gray-100 bg-slate-800 px-3 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white">Hatırlatma tarihleri</h2>
        </div>
        <div className="p-4">
          {reminders.length === 0 ? (
            <div className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm leading-relaxed text-amber-950">
                <p>Bu demirbaş için herhangi bir hatırlatma tarihi eklenmemiş.</p>
                <p className="mt-2 text-amber-900/90">
                  Garanti süresi bitimi, araç muayenesi, sigorta yenileme vb. önemli tarihleri kaydedebilirsiniz.
                  Zamanı gelince size hatırlatırız.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {reminders.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <p className="font-semibold text-slate-900">{formatDate(r.reminder_date)}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{r.description?.trim() || '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      SMS:{' '}
                      {r.sms_send_hour != null
                        ? `${String(r.sms_send_hour).padStart(2, '0')}:00`
                        : 'İstenmiyor'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditReminder(r)}
                      className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-900"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteReminder(r)}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-800"
                    >
                      Sil
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <FixedAssetModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        initial={assetToModal(asset)}
        onSaved={load}
      />

      <ReminderModal
        open={reminderModalOpen}
        onClose={() => {
          setReminderModalOpen(false)
          setReminderInitial(null)
        }}
        assetId={id}
        initial={reminderInitial}
        onSaved={load}
      />
    </div>
  )
}
