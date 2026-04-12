'use client'

import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export type FixedAssetModalValues = {
  id?: string
  name: string
  description: string
  serial_no: string
  purchase_date: string
  price: string
  notes: string
}

const emptyForm: FixedAssetModalValues = {
  name: '',
  description: '',
  serial_no: '',
  purchase_date: '',
  price: '',
  notes: '',
}

export default function FixedAssetModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: FixedAssetModalValues | null
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FixedAssetModalValues>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(initial ? { ...emptyForm, ...initial } : emptyForm)
  }, [open, initial])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = form.name.trim()
    if (!n) {
      toast.error('Demirbaş adı girin')
      return
    }

    const payload: Record<string, unknown> = {
      name: n,
      description: form.description.trim() || null,
      serial_no: form.serial_no.trim() || null,
      purchase_date: form.purchase_date.trim() || null,
    }
    if (form.price.trim() !== '') {
      const p = parseFloat(String(form.price).replace(',', '.'))
      if (Number.isNaN(p) || p < 0) {
        toast.error('Geçerli fiyat girin')
        return
      }
      payload.price = p
    } else {
      payload.price = null
    }
    payload.notes = form.notes.trim() || null

    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const url = isEdit ? `/api/fixed-assets/${initial!.id}` : '/api/fixed-assets'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success(isEdit ? 'Demirbaş güncellendi' : 'Demirbaş kaydedildi')
      onClose()
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" onClick={onClose}>
      <div
        className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixed-asset-modal-title"
      >
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ backgroundColor: '#76D7B5' }}
        >
          <h2 id="fixed-asset-modal-title" className="text-sm font-bold text-white">
            Demirbaş Tanımı
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white hover:bg-black/10"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Demirbaş adı</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Açıklaması</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Seri No</label>
              <input
                value={form.serial_no}
                onChange={(e) => setForm((f) => ({ ...f, serial_no: e.target.value }))}
                className={inputClass}
                placeholder="varsa seri no, plaka no vs girebilirsiniz."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Alış tarihi{' '}
                <span className="font-normal text-slate-400">(isteğe bağlı)</span>
              </label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Fiyatı{' '}
                <span className="font-normal text-slate-400">(isteğe bağlı)</span>
              </label>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                inputMode="decimal"
                className={inputClass}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Not</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className={`${inputClass} resize-y`}
                placeholder="Kısa notlar"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <X className="h-4 w-4" />
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
