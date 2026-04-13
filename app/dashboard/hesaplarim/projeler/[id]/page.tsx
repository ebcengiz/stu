'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
  ChevronDown,
  Tag,
  Gavel,
  MinusCircle,
  Receipt,
  StickyNote,
  FileText,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import ProjectModal, { type ProjectModalValues } from '@/components/projects/ProjectModal'

type Project = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

function formatMoney(n: number | string | null | undefined, cur?: string | null) {
  if (n == null || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  const c = cur || 'TRY'
  return c === 'TRY' ? `${s} ₺` : `${s} ${c}`
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('tr-TR')
}

export default function ProjeDetayPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id ?? '')

  const [project, setProject] = useState<Project | null>(null)
  const [totals, setTotals] = useState<Record<string, number> | null>(null)
  const [purchases, setPurchases] = useState<Record<string, unknown>[]>([])
  const [sales, setSales] = useState<Record<string, unknown>[]>([])
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([])
  const [cari, setCari] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [openExp, setOpenExp] = useState(true)
  const [openSal, setOpenSal] = useState(true)
  const [openPur, setOpenPur] = useState(true)
  const [openCari, setOpenCari] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    try {
      const res = await fetch(`/api/projects/${id}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Yüklenemedi')
      setProject(j.project ?? null)
      setTotals(j.totals ?? null)
      setPurchases(Array.isArray(j.purchases) ? j.purchases : [])
      setSales(Array.isArray(j.sales) ? j.sales : [])
      setExpenses(Array.isArray(j.expenses) ? j.expenses : [])
      setCari(Array.isArray(j.cari_combined) ? j.cari_combined : [])
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi')
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!closeConfirmOpen && !deleteConfirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCloseConfirmOpen(false)
        setDeleteConfirmOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeConfirmOpen, deleteConfirmOpen])

  const openDeleteConfirm = () => {
    if (!project) return
    setDeleteConfirmOpen(true)
  }

  const performDelete = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Proje silindi')
      router.push('/dashboard/hesaplarim/projeler')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const closeProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      toast.success('Proje kapatıldı (pasif)')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  const reopenProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      toast.success('Proje tekrar açıldı (aktif)')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Yükleniyor…</p>
  }

  if (loadError || !project) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{loadError || 'Kayıt yok'}</p>
        <Link href="/dashboard/hesaplarim/projeler" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Projelere dön
        </Link>
      </div>
    )
  }

  const payTotal =
    (totals?.customer_payments ?? 0) + (totals?.supplier_payments ?? 0)

  const modalValues: ProjectModalValues = {
    id: project.id,
    name: project.name,
    description: project.description ?? '',
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <Link
        href="/dashboard/hesaplarim/projeler"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Projelere dön
      </Link>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="bg-[#1e3a5f] px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-sm font-bold uppercase tracking-wide text-white sm:text-base">{project.name}</h1>
            {!project.is_active && (
              <span className="shrink-0 rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95">
                Kapalı
              </span>
            )}
          </div>
        </div>
        <div className="p-4 text-sm text-slate-800">
          <p className="whitespace-pre-wrap">{project.description?.trim() || '—'}</p>
        </div>
      </div>

      {!project.is_active && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <p className="font-semibold">Bu proje kapatılmış.</p>
          <p className="mt-1 text-amber-900/90">
            Masraf, alış veya satış girişlerinde tekrar seçilebilmesi için aşağıdaki «Projeyi Tekrar Aç» düğmesini kullanın.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm hover:bg-sky-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Güncelle
        </button>
        {project.is_active ? (
          <button
            type="button"
            onClick={() => setCloseConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-100"
          >
            <Ban className="h-3.5 w-3.5" />
            Projeyi Kapat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void reopenProject()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Projeyi Tekrar Aç
          </button>
        )}
        <Link
          href={`/dashboard/hesaplarim/projeler/${id}/notlar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900"
        >
          <StickyNote className="h-3.5 w-3.5" />
          Notlar
        </Link>
        <Link
          href={`/dashboard/hesaplarim/projeler/${id}/dokumanlar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 shadow-sm hover:bg-violet-100"
        >
          <FileText className="h-3.5 w-3.5" />
          Dökümanlar
        </Link>
        <button
          type="button"
          onClick={openDeleteConfirm}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Projeyi Sil
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500 text-white">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-rose-900/80">Masraflar</p>
            <p className="text-lg font-bold text-rose-950">{formatMoney(totals?.expenses ?? 0, 'TRY')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-sky-900/80">Alışlar</p>
            <p className="text-lg font-bold text-sky-950">{formatMoney(totals?.purchases ?? 0, 'TRY')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Gavel className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-900/80">Satışlar</p>
            <p className="text-lg font-bold text-emerald-950">{formatMoney(totals?.sales ?? 0, 'TRY')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-800 px-4 py-4 shadow-sm text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
            <MinusCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-200">Ödemeler (cari)</p>
            <p className="text-lg font-bold">{formatMoney(payTotal, 'TRY')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Önceki masraflar" open={openExp} onToggle={() => setOpenExp(!openExp)}>
          {expenses.length === 0 ? (
            <EmptyBox text="Bu proje için hiç masraf yapılmamış." />
          ) : (
            <ul className="divide-y divide-amber-100 text-sm">
              {expenses.map((r) => (
                <li key={String(r.id)} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-slate-700">{formatDate(String(r.transaction_date))}</span>
                  <span className="font-semibold text-slate-900">{formatMoney(r.amount_gross as number, String(r.currency))}</span>
                  <span className="w-full text-xs text-slate-500">{(r.description as string) || '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Önceki satışlar" open={openSal} onToggle={() => setOpenSal(!openSal)}>
          {sales.length === 0 ? (
            <EmptyBox text="Bu proje kapsamında hiç satış işlemi kaydedilmemiş." />
          ) : (
            <ul className="divide-y divide-amber-100 text-sm">
              {sales.map((r) => (
                <li key={String(r.id)} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{formatDate(String(r.sale_date))}</span>
                  <span className="font-semibold">{formatMoney(r.total_amount as number, String(r.currency))}</span>
                  <span className="w-full text-xs text-slate-500">
                    Belge: {(r.document_no as string) || '—'} · {(r.description as string)?.trim() || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Önceki alışlar" open={openPur} onToggle={() => setOpenPur(!openPur)}>
          {purchases.length === 0 ? (
            <EmptyBox text="Bu proje için hiç alış yapılmamış." />
          ) : (
            <ul className="divide-y divide-amber-100 text-sm">
              {purchases.map((r) => (
                <li key={String(r.id)} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{formatDate(String(r.purchase_date))}</span>
                  <span className="font-semibold">{formatMoney(r.total_amount as number, String(r.currency))}</span>
                  <span className="w-full text-xs text-slate-500">
                    Belge: {(r.document_no as string) || '—'} · {(r.description as string)?.trim() || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Önceki cari hareketler" open={openCari} onToggle={() => setOpenCari(!openCari)}>
          {cari.length === 0 ? (
            <EmptyBox text="Bu proje için hiç cari hareket kaydı yok." />
          ) : (
            <ul className="divide-y divide-amber-100 text-sm">
              {cari.map((r) => (
                <li key={`${r.source}-${String(r.id)}`} className="py-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-slate-600">{formatDate(String(r.transaction_date))}</span>
                    <span className="font-semibold text-slate-900">{formatMoney(r.amount as number, String(r.currency))}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {String(r.source) === 'customer' ? 'Müşteri' : 'Tedarikçi'}: {String(r.party)} · {String(r.type)}
                  </p>
                  <p className="text-xs text-slate-600">{(r.description as string) || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalValues}
        onSaved={load}
      />

      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-teal-500 px-4 py-3 sm:px-5">
              <h2 id="delete-project-confirm-title" className="text-base font-semibold text-white">
                Dikkat
              </h2>
              <button
                type="button"
                className="rounded-md p-1 text-white transition hover:bg-white/15"
                aria-label="Kapat"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-relaxed text-rose-950">
                Dikkat! Seçtiğiniz proje sistemden silinecek.{' '}
                <span className="font-bold text-red-700">Bu işlem geri alınamaz.</span> Projeyi sildiğiniz zaman bu
                projeye ait eski hareketler (alışlar, masraflar vs) silinmeyecektir. Bunları silmek istiyorsanız ilgili
                hareketleri ayrıca silin.
              </div>
              <p className="text-base font-semibold text-slate-900">Proje silme işlemini onaylıyor musunuz?</p>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Hayır
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                  onClick={() => {
                    setDeleteConfirmOpen(false)
                    void performDelete()
                  }}
                >
                  Evet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {closeConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setCloseConfirmOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-project-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-teal-600 px-4 py-3 sm:px-5">
              <h2 id="close-project-confirm-title" className="text-base font-semibold text-white">
                Proje Kapatma Onayı
              </h2>
              <button
                type="button"
                className="rounded-md p-1 text-white transition hover:bg-white/15"
                aria-label="Kapat"
                onClick={() => setCloseConfirmOpen(false)}
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-900">
                Kapattığınız proje masraf, alış ve satış ekranlarında artık seçilemez ve listelerde varsayılan
                görünümde yer almaz. Kapalı bir projeyi istediğiniz zaman bu sayfadan tekrar açabilirsiniz.
              </div>
              <p className="text-base font-semibold text-slate-900">Proje kapatmayı onaylıyor musunuz?</p>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                  onClick={() => setCloseConfirmOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                  Hayır
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  onClick={() => {
                    setCloseConfirmOpen(false)
                    void closeProject()
                  }}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Evet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-gray-100 bg-slate-800 px-3 py-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-white">{title}</span>
        <ChevronDown className={`h-4 w-4 text-white transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">{text}</div>
  )
}
