'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, FolderKanban } from 'lucide-react'
import ProjectModal, { type ProjectModalValues } from '@/components/projects/ProjectModal'

type ProjectRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

export default function ProjelerPage() {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<ProjectModalValues | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/projects')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Yüklenemedi')
      setRows(Array.isArray(j.projects) ? j.projects : [])
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

  const filtered = useMemo(() => {
    let list = rows
    if (!showInactive) list = list.filter((r) => r.is_active)
    const s = q.trim().toLowerCase()
    if (s) list = list.filter((r) => r.name.toLowerCase().includes(s))
    return list
  }, [rows, q, showInactive])

  const openCreate = () => {
    setModalInitial(null)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Projeler</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Proje Ekle
        </button>
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
            <p className="font-semibold text-amber-950">Hiç proje kaydınız bulunmuyor.</p>
            <p className="mt-1 text-amber-900/90">
              Eğer proje bazında masraf takibi yapıyorsanız yukarıdaki{' '}
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Proje Ekle
              </button>{' '}
              düğmesini kullanarak proje açabilirsiniz. Böylece masraflarınızı, alışlarınızı ve satışlarınızı girerken
              proje seçebilirsiniz; tüm gelir ve giderleri bu projenin detayında toplu görebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-100 bg-slate-50 px-3 py-2.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span>Bul:</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ara…"
                className="w-40 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-slate-900 sm:w-52"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Pasifleri de göster
            </label>
          </div>
          <div className="divide-y divide-gray-100 p-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">Sonuç yok. Filtreyi değiştirin veya yeni proje ekleyin.</p>
            ) : (
              filtered.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/hesaplarim/projeler/${r.id}`}
                  className="block rounded-md bg-sky-500 px-3 py-2.5 text-white shadow-sm transition hover:bg-sky-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold lowercase">
                      <FolderKanban className="h-4 w-4 shrink-0 opacity-90" />
                      <span className="truncate">{r.name}</span>
                    </span>
                    {!r.is_active && (
                      <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase">Pasif</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Yükleniyor…</p>}

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalInitial}
        onSaved={load}
      />
    </div>
  )
}
