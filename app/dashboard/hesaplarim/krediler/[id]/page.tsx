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
  Printer,
  List,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoanModal, { type LoanModalValues } from '@/components/loans/LoanModal'
import LoanPaymentModal from '@/components/loans/LoanPaymentModal'

type InstallmentRow = {
  id: string
  sort_order: number
  due_date: string
  amount: number | string
  paid_amount: number | string
}

type LoanData = {
  id: string
  name: string
  total_loan_amount?: number | string
  total_repayment_planned?: number | string | null
  remaining_debt: number | string
  remaining_installments: number
  next_installment_date: string | null
  payment_schedule: string
  payment_account_id: string | null
  notes: string | null
  currency: string
  payment_account?: { id: string; name: string } | null
}

type AccountOpt = { id: string; name: string; is_active?: boolean }

function formatMoney(n: number | string, cur: string) {
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

function formatDateLong(iso: string) {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function loanToModal(l: LoanData): LoanModalValues {
  const trp =
    l.total_repayment_planned != null && String(l.total_repayment_planned).trim() !== ''
      ? String(l.total_repayment_planned).replace('.', ',')
      : ''
  return {
    id: l.id,
    name: l.name,
    total_loan_amount:
      l.total_loan_amount != null ? String(l.total_loan_amount).replace('.', ',') : '',
    total_repayment_planned: trp,
    remaining_debt: String(l.remaining_debt ?? '').replace('.', ','),
    remaining_installments: String(l.remaining_installments ?? ''),
    next_installment_date: l.next_installment_date ? String(l.next_installment_date).slice(0, 10) : '',
    payment_schedule: l.payment_schedule || 'monthly',
    payment_account_id: l.payment_account_id ?? '',
    notes: l.notes ?? '',
  }
}

export default function KrediDetayPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id ?? '')

  const [loan, setLoan] = useState<LoanData | null>(null)
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [accounts, setAccounts] = useState<AccountOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<LoanModalValues | null>(null)

  const [addInstOpen, setAddInstOpen] = useState(false)
  const [instDate, setInstDate] = useState('')
  const [instAmount, setInstAmount] = useState('')
  const [instSaving, setInstSaving] = useState(false)

  const [payModalInstId, setPayModalInstId] = useState<string | null>(null)
  const [payModalMax, setPayModalMax] = useState(0)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    try {
      const [rLoan, rAcc] = await Promise.all([fetch(`/api/loans/${id}`), fetch('/api/accounts')])
      const j = await rLoan.json().catch(() => ({}))
      const jAcc = await rAcc.json().catch(() => [])
      if (!rLoan.ok) throw new Error(j.error || 'Yüklenemedi')
      setLoan(j.loan)
      setInstallments(Array.isArray(j.installments) ? j.installments : [])
      setAccounts(Array.isArray(jAcc) ? jAcc : [])
    } catch (e: any) {
      setLoadError(e.message || 'Yüklenemedi')
      setLoan(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = () => {
    if (!loan) return
    setModalInitial(loanToModal(loan))
    setModalOpen(true)
  }

  const confirmDeleteLoan = () => {
    if (!loan) return
    toast.custom(
      (t) => (
        <div className="pointer-events-auto max-w-sm rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
          <p className="text-sm font-semibold text-slate-900">Bu krediyi silmek istiyor musunuz?</p>
          <p className="mt-1 text-xs text-slate-600">{loan.name}</p>
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
                void performDelete()
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

  const performDelete = async () => {
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Kredi silindi')
      router.push('/dashboard/hesaplarim/krediler')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi')
    }
  }

  const openPayModal = (instId: string, unpaid: number) => {
    setPayModalMax(unpaid)
    setPayModalInstId(instId)
  }

  const submitNewInst = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(String(instAmount).replace(',', '.'))
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error('Geçerli tutar girin')
      return
    }
    if (!instDate.trim()) {
      toast.error('Tarih seçin')
      return
    }
    setInstSaving(true)
    try {
      const res = await fetch(`/api/loans/${id}/installments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: instDate, amount: amt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Eklenemedi')
      toast.success('Taksit eklendi')
      setAddInstOpen(false)
      setInstDate('')
      setInstAmount('')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Hata')
    } finally {
      setInstSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Yükleniyor…</p>
  }

  if (loadError || !loan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{loadError || 'Kayıt yok'}</p>
        <Link href="/dashboard/hesaplarim/krediler" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Kredilere dön
        </Link>
      </div>
    )
  }

  const cur = loan.currency || 'TRY'

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/hesaplarim/krediler"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kredilere dön
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="bg-[#1e3a5f] px-3 py-2">
          <h1 className="text-sm font-bold uppercase tracking-wide text-white">{loan.name}</h1>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <div className="flex justify-between gap-3 text-sm sm:col-span-2">
            <span className="shrink-0 text-right font-medium text-slate-500">Ödeme hesabı</span>
            <span className="min-w-0 text-left font-semibold text-slate-900">
              {loan.payment_account?.name ?? 'Taksit ödemelerinde seçilir'}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Çekilen tutar</span>
            <span className="text-left font-semibold text-slate-900">
              {formatMoney(loan.total_loan_amount ?? 0, cur)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Ödenecek toplam (plan)</span>
            <span className="text-left font-semibold text-slate-900">
              {loan.total_repayment_planned != null && String(loan.total_repayment_planned).trim() !== ''
                ? formatMoney(loan.total_repayment_planned, cur)
                : '—'}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-right font-medium text-slate-500">Kalan borç</span>
            <span className="text-left font-semibold text-slate-900">{formatMoney(loan.remaining_debt, cur)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm sm:col-span-2">
            <span className="shrink-0 text-right font-medium text-slate-500">Notlar</span>
            <span className="min-w-0 whitespace-pre-wrap text-left text-slate-800">{loan.notes?.trim() || '—'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm hover:bg-sky-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Güncelle
        </button>
        <button
          type="button"
          onClick={() => {
            setInstDate(new Date().toISOString().slice(0, 10))
            setInstAmount('')
            setAddInstOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Taksit tarihi ekle
        </button>
        <button
          type="button"
          onClick={confirmDeleteLoan}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Krediyi sil
        </button>
        <Link
          href={`/dashboard/hesaplarim/krediler/${id}/dokumanlar`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 shadow-sm hover:bg-violet-100"
        >
          <FileText className="h-3.5 w-3.5" />
          Dökümanlar
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-slate-800 px-3 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white">Ödeme tarihleri</h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => toast('Excel dışa aktarma yakında', { icon: '📊' })}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              <List className="h-3 w-3" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => toast('PDF yakında', { icon: '📄' })}
              className="inline-flex items-center gap-1 rounded bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange-600"
            >
              <Printer className="h-3 w-3" />
              PDF
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[520px] table-auto border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-100 text-left text-xs font-semibold text-slate-700">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Tarih</th>
                <th className="px-2 py-2">Tutar</th>
                <th className="px-2 py-2">Ödenen</th>
                <th className="px-2 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Henüz taksit satırı yok.
                  </td>
                </tr>
              ) : (
                installments.map((row, idx) => {
                  const paid = Number(row.paid_amount)
                  const total = Number(row.amount)
                  const unpaid = Math.round((total - paid) * 100) / 100
                  const done = unpaid <= 0
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}
                    >
                      <td className="px-2 py-2 text-slate-700">{row.sort_order}</td>
                      <td className="px-2 py-2 font-medium text-emerald-700">{formatDateLong(row.due_date)}</td>
                      <td className="px-2 py-2 text-slate-900">{formatMoney(row.amount, cur)}</td>
                      <td className="px-2 py-2 text-slate-700">{formatMoney(row.paid_amount, cur)}</td>
                      <td className="px-2 py-2 text-center">
                        {done ? (
                          <span className="text-xs text-emerald-600">Ödendi</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPayModal(row.id, unpaid)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            ödeme yap
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <LoanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalInitial}
        accounts={accounts}
        onSaved={load}
      />

      <LoanPaymentModal
        open={payModalInstId != null}
        onClose={() => setPayModalInstId(null)}
        loanId={id}
        installmentId={payModalInstId}
        currency={cur}
        maxPay={payModalMax}
        onPaid={() => void load()}
      />

      {addInstOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" onClick={() => setAddInstOpen(false)}>
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Taksit tarihi ekle</h3>
            <form onSubmit={submitNewInst} className="mt-3 space-y-2">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-slate-600">Tarih</label>
                <input
                  type="date"
                  value={instDate}
                  onChange={(e) => setInstDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-slate-600">Tutar</label>
                <input
                  value={instAmount}
                  onChange={(e) => setInstAmount(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddInstOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={instSaving}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
