'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  ListChecks,
  ChevronDown,
  Search,
  ChevronUp,
  ArrowUpDown,
  MoreHorizontal,
  Printer,
  Pencil,
  Copy,
  Trash2,
  FilePlus,
  Paperclip,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { MasrafGroup } from '@/lib/masraf-kalemleri'
import { findMasrafLabel, MASRAF_GROUPS } from '@/lib/masraf-kalemleri'
import { expensePaymentChannelLabel } from '@/lib/expense-payment-display'

type StatusTab = 'paid' | 'unpaid' | 'overdue' | 'all'
type Period = 'year' | 'month' | 'lastMonth' | 'last3' | 'today' | 'all'

type SortKey = 'transaction_date' | 'doc_no' | 'payment_date' | 'expense_item' | 'amount_gross' | 'vat_rate'

interface ExpenseRow {
  id: string
  expense_item_key: string
  transaction_date: string
  doc_no: string | null
  description: string | null
  payment_status: 'later' | 'paid' | 'partial'
  payment_date: string | null
  amount_gross: number | string
  vat_rate: string | null
  recurring: boolean
  currency: string
  created_at: string
  payment_account_id?: string | null
  payment_employee_id?: string | null
  payment_account?: { id: string; name: string; type: string } | null
  payment_employee?: { id: string; name: string } | null
  attachment_url?: string | null
}

const STATUS_TABS: { id: StatusTab; label: string; danger?: boolean }[] = [
  { id: 'paid', label: 'Ödenmişler' },
  { id: 'unpaid', label: 'Ödenecekler' },
  { id: 'overdue', label: 'Gecikmişler', danger: true },
  { id: 'all', label: 'Tümü' },
]

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'year', label: 'Bu Yılın Masraflarını Göster' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'lastMonth', label: 'Geçen Ay' },
  { value: 'last3', label: 'Son 3 Ay' },
  { value: 'today', label: 'Bugün' },
  { value: 'all', label: 'Tamamını Göster' },
]

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function formatTrDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = String(iso).slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return '—'
  return `${day}.${m}.${y}`
}

function formatMoney(n: number | string, cur: string) {
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

function paymentStatusLabel(s: ExpenseRow['payment_status']) {
  if (s === 'paid') return 'Ödenmiş'
  if (s === 'partial') return 'Kısmen ödendi'
  return 'Ödenmedi'
}

function inPeriod(txDateStr: string, period: Period): boolean {
  const tx = new Date(txDateStr + 'T12:00:00')
  const now = new Date()
  if (period === 'all') return true
  if (period === 'today') {
    return tx.toDateString() === now.toDateString()
  }
  if (period === 'month') {
    return tx.getFullYear() === now.getFullYear() && tx.getMonth() === now.getMonth()
  }
  if (period === 'lastMonth') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return tx.getFullYear() === lm.getFullYear() && tx.getMonth() === lm.getMonth()
  }
  if (period === 'last3') {
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - 3)
    return tx >= cutoff
  }
  if (period === 'year') {
    return tx.getFullYear() === now.getFullYear()
  }
  return true
}

function matchesStatus(row: ExpenseRow, tab: StatusTab): boolean {
  if (tab === 'all') return true
  if (tab === 'paid') return row.payment_status === 'paid'
  if (tab === 'unpaid') return row.payment_status === 'later' || row.payment_status === 'partial'
  if (tab === 'overdue') {
    if (row.payment_status !== 'later') return false
    if (!row.payment_date) return false
    const pd = new Date(String(row.payment_date).slice(0, 10) + 'T12:00:00')
    return pd < startOfDay(new Date())
  }
  return true
}

function hesapLabel(r: ExpenseRow): string {
  if (r.payment_employee?.name) return r.payment_employee.name
  if (r.payment_account?.name) return r.payment_account.name
  return '—'
}

function odemeLabel(r: ExpenseRow): string {
  if (r.payment_employee_id || r.payment_employee) {
    return expensePaymentChannelLabel('employee', null)
  }
  if (r.payment_account_id || r.payment_account) {
    return expensePaymentChannelLabel('account', r.payment_account?.type)
  }
  return '—'
}

function compare(a: string | number, b: string | number, dir: 'asc' | 'desc') {
  if (a < b) return dir === 'asc' ? -1 : 1
  if (a > b) return dir === 'asc' ? 1 : -1
  return 0
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-semibold hover:text-white/95"
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 opacity-90" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-90" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}

export default function MasraflarPage() {
  const router = useRouter()
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [period, setPeriod] = useState<Period>('last3')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [actionMenu, setActionMenu] = useState<{
    id: string
    top: number
    right: number
  } | null>(null)
  const periodRef = useRef<HTMLDivElement>(null)
  const actionMenuPortalRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [attachmentTargetId, setAttachmentTargetId] = useState<string | null>(null)

  const [masrafGroups, setMasrafGroups] = useState<MasrafGroup[]>(MASRAF_GROUPS)

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? 'Son 3 Ay'

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (periodRef.current && !periodRef.current.contains(t)) setPeriodOpen(false)
      const el = t instanceof Element ? t : (t as Node).parentElement
      if (
        actionMenuPortalRef.current?.contains(t) ||
        el?.closest?.('[data-expense-action-trigger]')
      ) {
        return
      }
      setActionMenu(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const close = () => setActionMenu(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [])

  const loadRows = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/expenses')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Liste yüklenemedi')
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setLoadError(e.message || 'Liste yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/expense-items')
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          setMasrafGroups(data.groups)
        }
      } catch {
        /* varsayılan STATIC_MASRAF_GROUPS kalır */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    let list = rows.filter((r) => inPeriod(r.transaction_date, period) && matchesStatus(r, statusTab))
    const q = search.trim()
    if (q.length >= 3) {
      const ql = q.toLowerCase()
      list = list.filter((r) => {
        const label = findMasrafLabel(r.expense_item_key, masrafGroups).toLowerCase()
        const desc = (r.description ?? '').toLowerCase()
        const doc = (r.doc_no ?? '').toLowerCase()
        const hesap = hesapLabel(r).toLowerCase()
        return label.includes(ql) || desc.includes(ql) || doc.includes(ql) || hesap.includes(ql)
      })
    }
    const dir = sortDir
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'transaction_date':
          return compare(String(a.transaction_date), String(b.transaction_date), dir)
        case 'doc_no':
          return compare(String(a.doc_no ?? ''), String(b.doc_no ?? ''), dir)
        case 'payment_date':
          return compare(String(a.payment_date ?? ''), String(b.payment_date ?? ''), dir)
        case 'expense_item':
          return compare(
            findMasrafLabel(a.expense_item_key, masrafGroups),
            findMasrafLabel(b.expense_item_key, masrafGroups),
            dir
          )
        case 'amount_gross': {
          const na = Number(a.amount_gross)
          const nb = Number(b.amount_gross)
          return compare(na, nb, dir)
        }
        case 'vat_rate':
          return compare(String(a.vat_rate ?? ''), String(b.vat_rate ?? ''), dir)
        default:
          return 0
      }
    })
    return sorted
  }, [rows, period, statusTab, search, sortKey, sortDir, masrafGroups])

  const totalAmount = useMemo(() => {
    return filtered.reduce((s, r) => s + Number(r.amount_gross || 0), 0)
  }, [filtered])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'transaction_date' || key === 'payment_date' ? 'desc' : 'asc')
    }
  }

  const emptyMessage = (() => {
    if (loading) return null
    if (loadError) return loadError
    if (rows.length === 0) return 'Henüz masraf kaydı yok'
    if (filtered.length === 0) return 'Eşleşen kayıt bulunamadı'
    return null
  })()

  const performDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast.success('Kayıt silindi')
      setActionMenu(null)
      loadRows()
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi')
    }
  }

  const handleDelete = (id: string) => {
    toast.custom(
      (t) => (
        <div
          className="pointer-events-auto max-w-sm rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5"
          role="dialog"
          aria-labelledby={`exp-del-title-${t.id}`}
        >
          <p id={`exp-del-title-${t.id}`} className="text-sm font-semibold text-slate-900">
            Bu masraf kaydını silmek istiyor musunuz?
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Ödeme veya cari bağlantısı varsa kasa, banka ve çalışan bakiyeleri güncellenir.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => toast.dismiss(t.id)}
            >
              İptal
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id)
                void performDeleteExpense(id)
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

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Genel Masraf Listesi</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/hesaplarim/masraflar/yeni"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Masraf Ekle
          </Link>
          <Link
            href="/dashboard/hesaplarim/masraflar/kalemleri"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <ListChecks className="h-4 w-4" />
            Masraf Kalemleri
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-0.5 shadow-inner">
            {STATUS_TABS.map((t) => {
              const active = statusTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusTab(t.id)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : t.danger
                        ? 'text-red-600 hover:bg-white/80 hover:text-red-700'
                        : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="relative flex flex-wrap items-center gap-3" ref={periodRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPeriodOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900"
              >
                {periodLabel}
                <ChevronDown className={`h-4 w-4 transition ${periodOpen ? 'rotate-180' : ''}`} />
              </button>
              {periodOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 min-w-[260px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {PERIOD_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        setPeriod(o.value)
                        setPeriodOpen(false)
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                        period === o.value ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex w-full min-w-[200px] flex-1 items-center gap-2 sm:w-auto lg:max-w-md">
              <span className="shrink-0 text-sm font-medium text-slate-600">Ara:</span>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="arama... (en az 3 karakter)"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none ring-blue-500/30 focus:border-blue-500 focus:ring-2"
                />
              </div>
            </div>
          </div>
        </div>

        {!loading && !loadError && rows.length > 0 && (
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-slate-500">
            {filtered.length} kayıt listeleniyor
          </p>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1180px] table-auto border-collapse text-sm">
            <thead>
              <tr className="bg-[#1e3a5f] text-left text-white">
                <th className="whitespace-nowrap px-2 py-3 font-semibold">
                  <SortHeader
                    label="İşlem Tarihi"
                    active={sortKey === 'transaction_date'}
                    dir={sortDir}
                    onClick={() => toggleSort('transaction_date')}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">
                  <SortHeader
                    label="Belge No"
                    active={sortKey === 'doc_no'}
                    dir={sortDir}
                    onClick={() => toggleSort('doc_no')}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">
                  <SortHeader
                    label="Vadesi"
                    active={sortKey === 'payment_date'}
                    dir={sortDir}
                    onClick={() => toggleSort('payment_date')}
                  />
                </th>
                <th className="px-2 py-3 font-semibold">Proje</th>
                <th className="min-w-[140px] px-2 py-3 font-semibold">
                  <SortHeader
                    label="Masraf"
                    active={sortKey === 'expense_item'}
                    dir={sortDir}
                    onClick={() => toggleSort('expense_item')}
                  />
                </th>
                <th className="min-w-[120px] px-2 py-3 font-semibold">Hesap</th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">
                  <SortHeader
                    label="Tutar"
                    active={sortKey === 'amount_gross'}
                    dir={sortDir}
                    onClick={() => toggleSort('amount_gross')}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">
                  <SortHeader
                    label="KDV (%)"
                    active={sortKey === 'vat_rate'}
                    dir={sortDir}
                    onClick={() => toggleSort('vat_rate')}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">Ödeme</th>
                <th className="whitespace-nowrap px-2 py-3 font-semibold">Durumu</th>
                <th className="min-w-[120px] px-2 py-3 font-semibold">Not</th>
                <th className="w-[100px] whitespace-nowrap px-1 py-3 text-center font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : emptyMessage ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const statusBadge =
                    r.payment_status === 'paid' ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {paymentStatusLabel(r.payment_status)}
                      </span>
                    ) : r.payment_status === 'partial' ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                        {paymentStatusLabel(r.payment_status)}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                        {paymentStatusLabel(r.payment_status)}
                      </span>
                    )
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-800">
                        {formatTrDate(r.transaction_date)}
                      </td>
                      <td className="max-w-[100px] truncate px-2 py-2.5 text-slate-700" title={r.doc_no ?? ''}>
                        {r.doc_no?.trim() || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">
                        {formatTrDate(r.payment_date)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-500">—</td>
                      <td className="max-w-[200px] px-2 py-2.5 text-slate-800">
                        {findMasrafLabel(r.expense_item_key, masrafGroups)}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2.5 text-slate-800" title={hesapLabel(r)}>
                        {hesapLabel(r)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-900">
                        {formatMoney(r.amount_gross, r.currency || 'TRY')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">
                        {r.vat_rate != null && r.vat_rate !== '' ? `${r.vat_rate}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">{odemeLabel(r)}</td>
                      <td className="px-2 py-2.5">{statusBadge}</td>
                      <td className="max-w-[220px] px-2 py-2.5 text-slate-600">
                        <div className="flex min-w-0 items-start gap-1.5">
                          {r.attachment_url ? (
                            <a
                              href={r.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 shrink-0 rounded p-0.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
                              title="Belgeyi aç"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Paperclip className="h-4 w-4" aria-hidden />
                            </a>
                          ) : null}
                          <span
                            className="min-w-0 truncate"
                            title={r.description?.trim() || (r.attachment_url ? 'Belge' : '')}
                          >
                            {r.description?.trim() ||
                              (r.attachment_url ? (
                                <span className="text-slate-400">(belge var)</span>
                              ) : (
                                '—'
                              ))}
                          </span>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          data-expense-action-trigger
                          onClick={(e) => {
                            e.stopPropagation()
                            const btn = e.currentTarget
                            const rect = btn.getBoundingClientRect()
                            setActionMenu((m) =>
                              m?.id === r.id
                                ? null
                                : {
                                    id: r.id,
                                    top: rect.bottom + 6,
                                    right: Math.max(8, window.innerWidth - rect.right),
                                  }
                            )
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-amber-50/90 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-amber-100"
                        >
                          İşlem
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !loadError && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Toplam:</span>{' '}
              <span>{filtered.length} kayıt</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-semibold tabular-nums">
                {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </p>
          </div>
        )}
      </div>

      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,application/pdf,image/*"
        onChange={async (e) => {
          const id = attachmentTargetId
          const file = e.target.files?.[0]
          e.target.value = ''
          setAttachmentTargetId(null)
          if (!id || !file) return
          try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch(`/api/expenses/${id}/attachment`, { method: 'POST', body: fd })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Yüklenemedi')
            toast.success('Belge eklendi')
            loadRows()
          } catch (err: any) {
            toast.error(err.message || 'Yüklenemedi')
          }
        }}
      />

      {typeof document !== 'undefined' &&
        actionMenu &&
        createPortal(
          <div
            ref={actionMenuPortalRef}
            className="fixed z-[500] w-48 rounded-lg border border-amber-200/90 bg-[#f5f0e6] py-1 text-left shadow-xl"
            style={{ top: actionMenu.top, right: actionMenu.right }}
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-black/5"
              onClick={() => {
                setActionMenu(null)
                window.print()
              }}
            >
              <Printer className="h-4 w-4 shrink-0" />
              Yazdır
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-800 hover:bg-black/5"
              onClick={() => {
                const eid = actionMenu.id
                setActionMenu(null)
                router.push(`/dashboard/hesaplarim/masraflar/yeni?edit=${eid}`)
              }}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              Düzenle
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-black/5"
              onClick={() => {
                const id = actionMenu.id
                setActionMenu(null)
                router.push(`/dashboard/hesaplarim/masraflar/yeni?copyFrom=${id}`)
              }}
            >
              <Copy className="h-4 w-4 shrink-0" />
              Kopyala
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={() => {
                const id = actionMenu.id
                setActionMenu(null)
                handleDelete(id)
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Sil
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-black/5"
              onClick={() => {
                const eid = actionMenu.id
                setActionMenu(null)
                setAttachmentTargetId(eid)
                requestAnimationFrame(() => attachmentInputRef.current?.click())
              }}
            >
              <FilePlus className="h-4 w-4 shrink-0" />
              + Belge Ekle
            </button>
          </div>,
          document.body
        )}

      <p className="text-xs text-slate-400">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}
