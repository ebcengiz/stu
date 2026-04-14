'use client'

import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { looseToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'
import { formatPaymentAccountOptionLabel, groupPaymentAccounts } from '@/lib/payment-account-options'

const PAYMENT_SCHEDULE_OPTIONS = [
  { value: 'monthly', label: 'Her Ay' },
  { value: 'every_2_months', label: 'İki Ayda Bir' },
  { value: 'every_3_months', label: 'Üç Ayda Bir' },
  { value: 'every_4_months', label: 'Dört Ayda Bir' },
  { value: 'every_6_months', label: 'Altı Ayda Bir' },
  { value: 'yearly', label: 'Yılda Bir' },
] as const

type AccountOpt = {
  id: string
  name: string
  type: string
  currency?: string
  balance?: number | string
  is_active?: boolean
}

export type LoanModalValues = {
  id?: string
  name: string
  /** Çekilen tutar (anapara) */
  total_loan_amount: string
  /** Ödenecek toplam tutar (faiz/vergi dahil sizin girdiğiniz plan) */
  total_repayment_planned: string
  remaining_debt: string
  remaining_installments: string
  next_installment_date: string
  payment_schedule: string
  payment_account_id: string
  notes: string
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

const emptyForm: LoanModalValues = {
  name: '',
  total_loan_amount: '',
  total_repayment_planned: '',
  remaining_debt: '',
  remaining_installments: '',
  next_installment_date: '',
  payment_schedule: 'monthly',
  payment_account_id: '',
  notes: '',
}

export default function LoanModal({
  open,
  onClose,
  initial,
  accounts,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: LoanModalValues | null
  accounts: AccountOpt[]
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<LoanModalValues>(emptyForm)

  const isCreate = !initial?.id

  useEffect(() => {
    if (!open) return
    if (!initial) {
      setForm(emptyForm)
      return
    }
    setForm({
      ...emptyForm,
      ...initial,
      total_loan_amount: looseToTrInputString(initial.total_loan_amount),
      total_repayment_planned: looseToTrInputString(initial.total_repayment_planned),
      remaining_debt: looseToTrInputString(initial.remaining_debt),
      remaining_installments: looseToTrInputString(initial.remaining_installments, 0),
    })
  }, [open, initial])

  const activeAccounts = accounts.filter((a) => a.is_active !== false)
  const groupedAccounts = groupPaymentAccounts(activeAccounts, { onlyOdeme: false })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = form.name.trim()
    if (!n) {
      toast.error('Kredi adı girin')
      return
    }

    if (isCreate) {
      const principal = parseTrNumberInput(form.total_loan_amount)
      const planned = parseTrNumberInput(form.total_repayment_planned)
      if (Number.isNaN(principal) || principal <= 0) {
        toast.error('Geçerli çekilen tutar girin')
        return
      }
      if (Number.isNaN(planned) || planned <= 0) {
        toast.error('Geçerli ödenecek toplam tutar girin')
        return
      }
      const inst = Math.trunc(parseTrNumberInput(form.remaining_installments))
      if (Number.isNaN(inst) || inst < 1 || inst > 144) {
        toast.error('Vade (taksit) 1–144 arasında olmalıdır')
        return
      }

      const payload = {
        name: n,
        total_loan_amount: principal,
        total_repayment_planned: planned,
        remaining_installments: inst,
        next_installment_date: form.next_installment_date.trim() || null,
        payment_schedule: form.payment_schedule,
        payment_account_id: form.payment_account_id || null,
        notes: form.notes.trim() || null,
      }

      setSaving(true)
      try {
        const res = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
        toast.success('Kredi kaydedildi')
        onClose()
        onSaved()
      } catch (e: any) {
        toast.error(e.message || 'İşlem başarısız')
      } finally {
        setSaving(false)
      }
      return
    }

    const debt = parseTrNumberInput(form.remaining_debt)
    if (Number.isNaN(debt) || debt < 0) {
      toast.error('Geçerli kalan borç tutarı girin')
      return
    }
    const inst = Math.trunc(parseTrNumberInput(form.remaining_installments))
    if (Number.isNaN(inst) || inst < 0 || inst > 144) {
      toast.error('Kalan taksit 0–144 arasında olmalıdır')
      return
    }

    const principalEdit = parseTrNumberInput(form.total_loan_amount)
    if (Number.isNaN(principalEdit) || principalEdit < 0) {
      toast.error('Geçerli çekilen tutar girin')
      return
    }

    const payload: Record<string, unknown> = {
      name: n,
      remaining_debt: debt,
      remaining_installments: inst,
      total_loan_amount: principalEdit,
      next_installment_date: form.next_installment_date.trim() || null,
      payment_schedule: form.payment_schedule,
      payment_account_id: form.payment_account_id || null,
      notes: form.notes.trim() || null,
    }
    if (form.total_repayment_planned.trim() !== '') {
      const plannedEdit = parseTrNumberInput(form.total_repayment_planned)
      if (Number.isNaN(plannedEdit) || plannedEdit < 0) {
        toast.error('Geçerli ödenecek toplam tutar girin')
        return
      }
      payload.total_repayment_planned = plannedEdit
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/loans/${initial!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast.success('Kredi güncellendi')
      onClose()
      onSaved()
    } catch (e: any) {
      toast.error(e.message || 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" onClick={onClose}>
      <div
        className="flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-modal-title"
      >
        <div className="flex items-center justify-between bg-emerald-600 px-3 py-2.5">
          <h2 id="loan-modal-title" className="text-sm font-bold text-white">
            Kredi Tanımı
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

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Kredi adı</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                required
              />
            </div>

            {isCreate ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    <span className="text-red-600">*</span> Çekilen tutar (TL)
                  </label>
                  <TrNumberInput
                    value={form.total_loan_amount}
                    onChange={(v) => setForm((f) => ({ ...f, total_loan_amount: v }))}
                    className={inputClass}
                    placeholder="Örn. 100.000"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    <span className="text-red-600">*</span> Ödenecek toplam tutar (TL)
                  </label>
                  <TrNumberInput
                    value={form.total_repayment_planned}
                    onChange={(v) => setForm((f) => ({ ...f, total_repayment_planned: v }))}
                    className={inputClass}
                    placeholder="Faiz, vergi ve masraflar dahil toplam"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Bu tutar üzerinden taksit planı oluşturulur; başlangıçtaki kalan borç buna eşittir.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    <span className="text-red-600">*</span> Vade (taksit sayısı)
                  </label>
                  <TrNumberInput
                    value={form.remaining_installments}
                    onChange={(v) => setForm((f) => ({ ...f, remaining_installments: v }))}
                    className={inputClass}
                    placeholder="Örn. 36"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Çekilen tutar (TL)</label>
                  <TrNumberInput
                    value={form.total_loan_amount}
                    onChange={(v) => setForm((f) => ({ ...f, total_loan_amount: v }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Ödenecek toplam tutar (plan, TL)</label>
                  <TrNumberInput
                    value={form.total_repayment_planned}
                    onChange={(v) => setForm((f) => ({ ...f, total_repayment_planned: v }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kalan borç (TL)</label>
                  <TrNumberInput
                    value={form.remaining_debt}
                    onChange={(v) => setForm((f) => ({ ...f, remaining_debt: v }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kalan taksit sayısı</label>
                  <TrNumberInput
                    value={form.remaining_installments}
                    onChange={(v) => setForm((f) => ({ ...f, remaining_installments: v }))}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-red-600">Maksimum 144 taksit</p>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Sıradaki ilk taksit tarihi</label>
              <input
                type="date"
                value={form.next_installment_date}
                onChange={(e) => setForm((f) => ({ ...f, next_installment_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ödeme takvimi</label>
              <select
                value={form.payment_schedule}
                onChange={(e) => setForm((f) => ({ ...f, payment_schedule: e.target.value }))}
                className={inputClass}
              >
                {PAYMENT_SCHEDULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {initial?.id ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Ödediğiniz hesap</label>
                <select
                  value={form.payment_account_id}
                  onChange={(e) => setForm((f) => ({ ...f, payment_account_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Hesap seçin</option>
                  {groupedAccounts.map((group) => (
                    <optgroup key={group.title} label={group.title}>
                      {group.items.map((a) => (
                        <option key={a.id} value={a.id}>
                          {formatPaymentAccountOptionLabel(a)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notlar</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className={`${inputClass} resize-y`}
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
