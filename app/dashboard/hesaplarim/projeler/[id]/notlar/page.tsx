'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  X,
  Check,
  StickyNote,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

type Project = { id: string; name: string; description: string | null }
type NoteRow = { id: string; body: string; created_at: string; updated_at: string }

function formatNoteDate(iso: string) {
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProjeNotlarPage() {
  const params = useParams()
  const id = String(params.id ?? '')

  const [project, setProject] = useState<Project | null>(null)
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<NoteRow | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    setLoading(true)
    try {
      const [rProj, rNotes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/notes`),
      ])
      const jProj = await rProj.json().catch(() => ({}))
      const jNotes = await rNotes.json().catch(() => ({}))
      if (!rProj.ok) throw new Error(jProj.error || 'Proje yüklenemedi')
      if (!rNotes.ok) throw new Error(jNotes.error || 'Notlar yüklenemedi')
      setProject(jProj.project ?? null)
      setNotes(Array.isArray(jNotes.notes) ? jNotes.notes : [])
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi')
      setProject(null)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setDraft('')
    setModalOpen(true)
  }

  const openEdit = (n: NoteRow) => {
    setEditing(n)
    setDraft(n.body)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setDraft('')
  }

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) {
      toast.error('Not metni girin')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/projects/${id}/notes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
        toast.success('Not güncellendi')
      } else {
        const res = await fetch(`/api/projects/${id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
        toast.success('Not kaydedildi')
      }
      closeModal()
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (n: NoteRow) => {
    toast.custom(
      (t) => (
        <div className="pointer-events-auto max-w-sm rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
          <p className="text-sm font-semibold text-gray-900">Bu notu silmek istiyor musunuz?</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDelete(n.id)
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

  const performDelete = async (noteId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/notes/${noteId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Not silindi')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const title = project?.name?.trim() || 'Proje'
  const subtitle = project?.description?.trim() || ''

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 overflow-x-hidden pb-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/hesaplarim/projeler/${id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 text-gray-400" />
              Geri Dön
            </Link>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Not Ekle
            </button>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Proje notları</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm leading-snug text-gray-500 whitespace-pre-wrap">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      ) : loadError ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <StickyNote className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-2 text-sm leading-relaxed text-gray-500">
              <p>
                Bu proje için henüz not kaydı yok.{' '}
                <button
                  type="button"
                  onClick={openNew}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Plus className="h-3 w-3" />
                  Yeni not ekle
                </button>{' '}
                ile kayıt oluşturabilirsiniz.
              </p>
              <div className="flex gap-2.5 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs leading-relaxed text-gray-600">
                  Önemli konuları (ör. fiyat pazarlığı) unutmamak için not düşebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Aldığınız notlar</p>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" />
              Yeni not ekle
            </button>
          </div>
          <div className="relative pl-1 sm:pl-2">
            <ul className="space-y-3 border-l-2 border-gray-200">
              {notes.map((n) => (
                <li key={n.id} className="relative -ml-px pl-4 sm:pl-5">
                  <span
                    className="absolute -left-[9px] top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-white shadow ring-1 ring-slate-200"
                    aria-hidden
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  </span>
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-sm ring-1 ring-slate-900/5 sm:p-4">
                    <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-red-600 tabular-nums">{formatNoteDate(n.created_at)}</p>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(n)}
                          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-800"
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(n)}
                          className="rounded-lg p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-700"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0f5f2]/50 p-3 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl ring-1 ring-slate-900/10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-modal-title"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4">
              <h2 id="note-modal-title" className="text-base font-semibold text-white">
                {editing ? 'Notu düzenle' : 'Not kaydı'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-1.5 text-white/90 transition hover:bg-gray-50 disabled:opacity-50"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitNote} className="flex flex-1 flex-col overflow-y-auto bg-white p-5">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-600">
                <StickyNote className="h-4 w-4 text-emerald-700" />
                Notlar
              </label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                placeholder="Notunuzu yazın…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
