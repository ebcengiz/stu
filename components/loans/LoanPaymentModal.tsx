'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { parseTrNumberInput } from '@/lib/tr-number-input'
import {
  formatPaymentAccountOptionLabel,
  groupPaymentAccounts,
  isDisbursementAccountType,
} from '@/lib/payment-account-options'

type AccountOpt = {
  id: string
  name: string
  type: string
  balance?: number | string
  currency?: string
  is_active?: boolean
}

export default function LoanPaymentModal({
  open,
  onClose,
  loanId,
  installmentId,
  currency,
  maxPay,
  onPaid,
}: {
  open: boolean
  onClose: () => void
  loanId: string
  installmentId: string | null
  currency: string
  maxPay: number
  onPaid: () => void
}) {
  const [accounts, setAccounts] = useState<AccountOpt[]>([])
  const [loadingAcc, setLoadingAcc] = useState(false)
  const [paidDate, setPaidDate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [saving, setSaving] = useState(false)

  const cur = currency || 'TRY'

  const matchingAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.is_active !== false &&
          (a.currency || 'TRY') === cur &&
          isDisbursementAccountType(a.type)
      ),
    [accounts, cur]
  )
  const groupedAccounts = useMemo(
    () => groupPaymentAccounts(matchingAccounts, { currency: cur, onlyOdeme: false }),
    [matchingAccounts, cur]
  )

  useEffect(() => {
    if (!open || !installmentId) return
    setPaidDate(new Date().toISOString().slice(0, 10))
    setAccountId('')
    const v = Math.max(0, Math.round(maxPay * 100) / 100)
    setAmountStr(
      v.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      })
    )
    setLoadingAcc(true)
    void fetch('/api/accounts')
      .then((r) => r.json())
      .then((j) => {
        setAccounts(Array.isArray(j) ? j : [])
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAcc(false))
  }, [open, installmentId, maxPay])

  const submit = async () => {
    if (!installmentId) return
    const pay = parseTrNumberInput(amountStr)
    if (Number.isNaN(pay) || pay <= 0) {
      toast.error('Geçerli tutar girin')
      return
    }
    const cap = Math.round(maxPay * 100) / 100
    if (pay > cap + 0.0001) {
      toast.error('Tutar kalan taksit tutarını aşamaz')
      return
    }
    if (!accountId) {
      toast.error('Hesap seçin')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/loans/${loanId}/installments/${installmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_account_id: accountId,
          amount: pay,
          transaction_date: paidDate.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Ödeme kaydedilemedi')
      toast.success('Ödeme kaydedildi')
      onPaid()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !installmentId) return null

  const pay = parseTrNumberInput(amountStr)
  const cap = Math.round(maxPay * 100) / 100
  const amountOk = !Number.isNaN(pay) && pay > 0 && pay <= cap + 0.0001

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" onClick={onClose}>
      <div
        className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-pay-title"
      >
        <div className="flex items-center justify-between bg-emerald-500 px-3 py-2.5">
          <h2 id="loan-pay-title" className="text-sm font-bold text-white">
            Ödeme Onayı
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

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Dikkat! Kredi ödemesi yapmak üzeresiniz. İşleme devam ederseniz seçtiğiniz hesabınızdan taksit
            tutarı düşülecektir.
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ödediğiniz Tarih</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ödediğiniz Hesap</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loadingAcc}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="">{loadingAcc ? 'Yükleniyor…' : 'Hesap seçin'}</option>
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
            {matchingAccounts.length === 0 && !loadingAcc ? (
              <p className="mt-1 text-xs text-amber-800">
                Bu kredi ile aynı para biriminde aktif hesap bulunmuyor; önce hesaplarınızdan uygun bir hesap ekleyin.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ödediğiniz Tutar</label>
            <TrNumberInput
              value={amountStr}
              onChange={setAmountStr}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <p className="text-center text-base font-medium text-slate-500">Ödeme işlemini onaylıyor musunuz?</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            <X className="h-4 w-4" />
            Hayır
          </button>
          <button
            type="button"
            disabled={saving || !accountId || !amountOk || matchingAccounts.length === 0}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Evet
          </button>
        </div>
      </div>
    </div>
  )
}
