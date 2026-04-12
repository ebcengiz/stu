'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

const SMS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'SMS İstemiyorum' },
  ...Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: `${String(h).padStart(2, '0')}:00`,
  })),
]

export type ReminderFormValues = {
  id?: string
  reminder_date: string
  description: string
  sms_send_hour: string
}

const empty: ReminderFormValues = {
  reminder_date: '',
  description: '',
  sms_send_hour: '',
}

export default function ReminderModal({
  open,
  onClose,
  assetId,
  initial,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  assetId: string
  initial: ReminderFormValues | null
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ReminderFormValues>(empty)

  useEffect(() => {
    if (!open) return
    if (initial) {
      const sms =
        initial.sms_send_hour !== undefined &&
        initial.sms_send_hour !== null &&
        String(initial.sms_send_hour) !== ''
          ? String(initial.sms_send_hour)
          : ''
      setForm({
        id: initial.id,
        reminder_date: initial.reminder_date ? String(initial.reminder_date).slice(0, 10) : '',
        description: initial.description ?? '',
        sms_send_hour: sms,
      })
    } else {
      setForm(empty)
    }
  }, [open, initial])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reminder_date.trim()) {
      toast.error('Tarih seçin')
      return
    }

    const body: Record<string, unknown> = {
      reminder_date: form.reminder_date.slice(0, 10),
      description: form.description.trim() || null,
      sms_send_hour:
        form.sms_send_hour === '' || form.sms_send_hour === undefined ? null : parseInt(form.sms_send_hour, 10),
    }

    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const reminderId = initial?.id
      const url = isEdit && reminderId
        ? `/api/fixed-assets/${assetId}/reminders/${reminderId}`
        : `/api/fixed-assets/${assetId}/reminders`
      const res = await fetch(url, {
        method: isEdit && reminderId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success(isEdit ? 'Hatırlatma güncellendi' : 'Hatırlatma eklendi')
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
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
      >
        <div className="flex items-center justify-between bg-emerald-500/90 px-3 py-2.5">
          <h2 id="reminder-modal-title" className="text-sm font-bold text-white">
            Hatırlatma Notları
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white hover:bg-white/10"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tarih</label>
              <input
                type="date"
                value={form.reminder_date}
                onChange={(e) => setForm((f) => ({ ...f, reminder_date: e.target.value }))}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="sigorta yenileme, muayene, bakım tarihi, garanti süresi..."
                className={`${inputClass} resize-y`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Şu saatte SMS gönder
              </label>
              <select
                value={form.sms_send_hour}
                onChange={(e) => setForm((f) => ({ ...f, sms_send_hour: e.target.value }))}
                className={inputClass}
              >
                {SMS_OPTIONS.map((o) => (
                  <option key={o.value === '' ? 'none' : o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                SMS gönderimi ileride entegre edilebilir; saat kaydı şimdilik saklanır.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
