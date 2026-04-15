'use client'

import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

export type ProjectModalValues = {
  id?: string
  name: string
  description: string
}

const empty: ProjectModalValues = { name: '', description: '' }

export default function ProjectModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: ProjectModalValues | null
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProjectModalValues>(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : empty)
    }
  }, [open, initial])

  if (!open) return null

  const isEdit = Boolean(initial?.id)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    try {
      const url = isEdit ? `/api/projects/${initial!.id}` : '/api/projects'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: form.description.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Kaydedilemedi')
      toast.success(isEdit ? 'Proje güncellendi' : 'Proje oluşturuldu')
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Proje Tanımı</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/90 hover:bg-white/10" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Proje adı</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Proje açıklama</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <X className="h-4 w-4" />
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
