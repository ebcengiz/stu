'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import LoanModal, { type LoanModalValues } from '@/components/loans/LoanModal'

type LoanRow = {
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
  this_month_due?: number
  payment_account?: { id: string; name: string } | null
}

type AccountOpt = {
  id: string
  name: string
  type: string
  currency?: string
  balance?: number | string
  is_active?: boolean
}

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
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Krediler</h1>
          <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Kredi Ekle
        </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Kalan ödemeler</p>
            <p className="text-right text-base font-bold text-primary-700">
              {formatMoney(summary.total_remaining, 'TRY')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bu ayki ödemeler</p>
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
              <button
                type="button"
                onClick={openCreate}
                className="mr-1 inline-flex align-middle items-center gap-1 rounded-md bg-primary-600 px-2 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Kredi Ekle
              </button>
              düğmesini veya sayfa üstündeki aynı adlı düğmeyi kullanarak kredilerinizi ve ödeme takvimini
              kaydedebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-100 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Borcu bitenleri de göster
            </label>
          </div>
          <div className="divide-y divide-gray-100 p-2">
            {visibleRows.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-gray-400">
                Gösterilecek kredi yok. Filtreyi kapatın veya yeni kredi ekleyin.
              </p>
            ) : (
              visibleRows.map((r) => {
                const ccy = r.currency || 'TRY'
                const cekilen = formatMoney(r.total_loan_amount ?? 0, ccy)
                const odenecek =
                  r.total_repayment_planned != null && String(r.total_repayment_planned).trim() !== ''
                    ? formatMoney(r.total_repayment_planned, ccy)
                    : '—'
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/hesaplarim/krediler/${r.id}`}
                    className="block rounded-md bg-primary-500 px-3 py-2.5 text-white transition hover:bg-primary-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold lowercase">{r.name}</span>
                      <span className="shrink-0 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-800 shadow-sm">
                        Kalan: {formatMoney(r.remaining_debt, ccy)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-primary-100">
                      <span>Çekilen: {cekilen}</span>
                      <span>Ödenecek toplam: {odenecek}</span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Yükleniyor…</p>}

      <p className="text-xs text-gray-500">{new Date().getFullYear()} © Mikro Muhasebe</p>

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
