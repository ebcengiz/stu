'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoanModal, { type LoanModalValues } from '@/components/loans/LoanModal'

type LoanRow = {
  id: string
  name: string
  total_loan_amount?: number | string
  remaining_debt: number | string
  remaining_installments: number
  next_installment_date: string | null
  payment_schedule: string
  payment_account_id: string | null
  notes: string | null
  currency: string
  this_month_due?: number
  payment_account?: { id: string; name: string } | null
}

type AccountOpt = { id: string; name: string; is_active?: boolean }

function formatMoney(n: number | string, cur: string) {
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

export default function KredilerPage() {
  const [rows, setRows] = useState<LoanRow[]>([])
  const [summary, setSummary] = useState({ total_remaining: 0, this_month_due: 0 })
  const [accounts, setAccounts] = useState<AccountOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<LoanModalValues | null>(null)

  const [showCompleted, setShowCompleted] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [rLoans, rAcc] = await Promise.all([fetch('/api/loans'), fetch('/api/accounts')])
      const jLoans = await rLoans.json().catch(() => ({}))
      const jAcc = await rAcc.json().catch(() => [])
      if (!rLoans.ok) throw new Error(jLoans.error || 'Liste yüklenemedi')
      const list = Array.isArray(jLoans.loans) ? jLoans.loans : Array.isArray(jLoans) ? jLoans : []
      setRows(list)
      setSummary(
        jLoans.summary ?? {
          total_remaining: list.reduce((s: number, r: LoanRow) => s + Number(r.remaining_debt ?? 0), 0),
          this_month_due: 0,
        }
      )
      setAccounts(Array.isArray(jAcc) ? jAcc : [])
    } catch (e: any) {
      setLoadError(e.message || 'Liste yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleRows = useMemo(() => {
    if (showCompleted) return rows
    return rows.filter((r) => Number(r.remaining_debt) > 0.001)
  }, [rows, showCompleted])

  const openCreate = () => {
    setModalInitial(null)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Krediler</h1>
          <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Kredi Ekle
        </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Kalan ödemeler</p>
            <p className="text-right text-base font-bold text-emerald-700">
              {formatMoney(summary.total_remaining, 'TRY')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bu ayki ödemeler</p>
            <p className="text-right text-base font-bold text-red-600">
              {formatMoney(summary.this_month_due, 'TRY')}
            </p>
          </div>
        </div>
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
            <p className="font-semibold text-amber-950">Hiç kredi kaydınız bulunmuyor.</p>
            <p className="mt-1 text-amber-900/90">
              Banka kredilerinizi, vergi borcu yapılandırmalarınızı ve ödeme planını girin; hem ödemelerinizi
              hatırlatırız hem de kalan tutarları kolayca takip edersiniz.
            </p>
            <p className="mt-2 text-amber-900/85">
              Yukarıdaki{' '}
              <span className="inline-flex items-center rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                + Yeni Kredi Ekle
              </span>{' '}
              düğmesini kullanarak kredilerinizi ve ödeme takvimini kaydedebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-100 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Borcu bitenleri de göster
            </label>
          </div>
          <div className="divide-y divide-gray-100 p-2">
            {visibleRows.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">
                Gösterilecek kredi yok. Filtreyi kapatın veya yeni kredi ekleyin.
              </p>
            ) : (
              visibleRows.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/hesaplarim/krediler/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-md bg-sky-500 px-3 py-2 text-white transition hover:bg-sky-600"
                >
                  <span className="min-w-0 truncate text-sm font-semibold lowercase">{r.name}</span>
                  <span className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                    {(r.currency || 'TRY') === 'TRY' ? 'TL' : r.currency}{' '}
                    {Number(r.remaining_debt).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Yükleniyor…</p>}

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>

      <LoanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={modalInitial}
        accounts={accounts}
        onSaved={load}
      />
    </div>
  )
}
