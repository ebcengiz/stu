'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from '@/components/ui/Button'
import { hasTerminationDate, isActiveEmployeeRecord } from '@/lib/employeeStatus'

type StatusFilter = 'all' | 'active' | 'left'

interface EmployeeApi {
  id: string
  name: string
  email: string | null
  phone: string | null
  department: string | null
  currency: string
  hire_date: string | null
  leave_date: string | null
  birth_date: string | null
  national_id: string | null
  monthly_net_salary: number | null
  bank_account_no: string | null
  address: string | null
  bank_details: string | null
  notes: string | null
  cari_balance?: number
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif Çalışanlar' },
  { value: 'left', label: 'İşten Çıkanlar' },
]

type ReportColumn = {
  key: Exclude<keyof RowDisplay, 'id'>
  label: string
  /** Başlık tooltip (kısaltılmış etiketler için) */
  headerTitle?: string
  /** Excel/PDF sütun adı (kısa başlıktan farklıysa) */
  exportLabel?: string
  /** Sütun genişliği (toplam 100) */
  widthPct: number
  /**
   * single: tek satır, taşan … + title
   * name: en fazla 2 satır (isim)
   * memo2 / memo3: adres / not benzeri sınırlı çok satır
   */
  cell: 'single' | 'name' | 'memo2' | 'memo3'
  /** Sayısal hizalama (maaş, bakiye) */
  tabular?: boolean
}

/** Genişlikler toplamı 100 — dolu alanlara daha fazla, dar alanlara daha az */
const REPORT_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'İsim', widthPct: 8, cell: 'name' },
  { key: 'email', label: 'E-posta', widthPct: 10, cell: 'single' },
  { key: 'phone', label: 'Telefon', widthPct: 6, cell: 'single' },
  { key: 'project', label: 'Proje', widthPct: 3, cell: 'single' },
  { key: 'hire_date', label: 'İşe Giriş', widthPct: 5, cell: 'single' },
  { key: 'leave_date', label: 'İşten Çıkış', widthPct: 5, cell: 'single' },
  {
    key: 'birth_date',
    label: 'Doğum',
    widthPct: 5,
    cell: 'single',
    headerTitle: 'Doğum Tarihi',
    exportLabel: 'Doğum Tarihi',
  },
  { key: 'national_id', label: 'Vergi/TCKN', widthPct: 6, cell: 'single' },
  {
    key: 'currency',
    label: 'PB',
    widthPct: 3,
    cell: 'single',
    headerTitle: 'Para Birimi',
    exportLabel: 'Para Birimi',
  },
  { key: 'monthly_net_salary', label: 'Net Maaş', widthPct: 6, cell: 'single', tabular: true },
  { key: 'balance', label: 'Bakiye', widthPct: 6, cell: 'single', tabular: true },
  { key: 'bank_account_no', label: 'IBAN', widthPct: 8, cell: 'single' },
  { key: 'department', label: 'Departman', widthPct: 6, cell: 'single' },
  { key: 'address', label: 'Adres', widthPct: 7, cell: 'memo3' },
  { key: 'bank_details', label: 'Banka', widthPct: 6, cell: 'memo2' },
  { key: 'notes', label: 'Not', widthPct: 5, cell: 'memo2' },
]

type RowDisplay = {
  id: string
  name: string
  email: string
  phone: string
  project: string
  hire_date: string
  leave_date: string
  birth_date: string
  national_id: string
  currency: string
  monthly_net_salary: string
  balance: string
  bank_account_no: string
  department: string
  address: string
  bank_details: string
  notes: string
}

function formatTrDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = String(iso).slice(0, 10)
  if (d.length !== 10) return ''
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return ''
  return `${day}.${m}.${y}`
}

function currencyLabel(code: string | null | undefined): string {
  const c = code || 'TRY'
  if (c === 'TRY') return 'TL'
  return c
}

function formatMoney(n: number | null | undefined, _currency: string): string {
  if (n == null || Number.isNaN(Number(n))) return ''
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBalance(n: number | undefined, currency: string): string {
  const v = Number(n ?? 0)
  return formatMoney(v, currency)
}

function toDisplayRow(e: EmployeeApi): RowDisplay {
  const cur = e.currency || 'TRY'
  return {
    id: e.id,
    name: e.name ?? '',
    email: e.email ?? '',
    phone: e.phone ?? '',
    project: '',
    hire_date: formatTrDate(e.hire_date),
    leave_date: formatTrDate(e.leave_date),
    birth_date: formatTrDate(e.birth_date),
    national_id: e.national_id ?? '',
    currency: currencyLabel(cur),
    monthly_net_salary: formatMoney(e.monthly_net_salary, cur),
    balance: formatBalance(e.cari_balance, cur),
    bank_account_no: e.bank_account_no ?? '',
    department: e.department ?? '',
    address: e.address ?? '',
    bank_details: e.bank_details ?? '',
    notes: e.notes ?? '',
  }
}

function filterByStatus(rows: EmployeeApi[], status: StatusFilter): EmployeeApi[] {
  if (status === 'active') return rows.filter((r) => isActiveEmployeeRecord(r.leave_date))
  if (status === 'left') return rows.filter((r) => hasTerminationDate(r.leave_date))
  return rows
}

type SortKey = Exclude<keyof RowDisplay, 'id'>
type SortDir = 'asc' | 'desc'

function compareCell(a: string, b: string, dir: SortDir): number {
  const cmp = a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
}

function isCellEmpty(raw: string): boolean {
  const v = raw?.trim() ?? ''
  return v === ''
}

/** Tek satır; uzun metinler sütunu genişletir, tablo yatay kaydırılarak gezilir. */
function ReportDataCell({ col, raw }: { col: ReportColumn; raw: string }) {
  if (isCellEmpty(raw)) {
    return (
      <span
        className="inline-block min-w-[2ch] select-none text-center text-gray-600"
        aria-hidden
      >
        —
      </span>
    )
  }

  const tabular = col.tabular ? 'tabular-nums' : ''
  const isName = col.cell === 'name'

  return (
    <span
      className={`inline-block max-w-none whitespace-nowrap text-left text-gray-800 ${tabular} ${
        isName ? 'font-semibold text-gray-900' : ''
      }`}
      title={raw}
    >
      {raw}
    </span>
  )
}

export default function CalisanRaporPage() {
  const [allRows, setAllRows] = useState<EmployeeApi[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [reportReady, setReportReady] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [resultOpen, setResultOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/employees', { cache: 'no-store' })
        if (!res.ok) throw new Error('Liste alınamadı')
        const data = await res.json()
        setAllRows(Array.isArray(data) ? data : [])
      } catch {
        toast.error('Çalışanlar yüklenemedi')
        setAllRows([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => filterByStatus(allRows, statusFilter), [allRows, statusFilter])

  const displayRows = useMemo(() => {
    const base = filtered.map(toDisplayRow)
    const sorted = [...base].sort((a, b) => compareCell(a[sortKey], b[sortKey], sortDir))
    return sorted
  }, [filtered, sortKey, sortDir])

  const handlePrepareReport = () => {
    setReportReady(true)
    setCriteriaOpen(false)
    setResultOpen(true)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const exportExcel = useCallback(() => {
    const headers = REPORT_COLUMNS.map((c) => c.exportLabel ?? c.label)
    const data = displayRows.map((row) => REPORT_COLUMNS.map((c) => row[c.key]))
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Çalışanlar')
    const name = `calisan-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, name)
    toast.success('Excel dosyası indirildi')
  }, [displayRows])

  const exportPdf = useCallback(() => {
    const headers = REPORT_COLUMNS.map((c) => c.exportLabel ?? c.label)
    const body = displayRows.map((row) =>
      REPORT_COLUMNS.map((c) => String(row[c.key] ?? ''))
    )
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
    doc.setFontSize(10)
    doc.text('Çalışan Raporu', 14, 12)
    autoTable(doc, {
      startY: 16,
      head: [headers],
      body,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
    })
    doc.save(`calisan-raporu-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF indirildi')
  }, [displayRows])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-10 py-12 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-gray-400">Rapor yükleniyor…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 overflow-x-hidden pb-2">
      {/* Üst başlık */}
      <div className="rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white via-white to-slate-50/90 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-md shadow-emerald-600/25">
              <FileBarChart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Çalışan raporu
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-500">
                Duruma göre filtreleyin; tabloyu sıralayın veya Excel / PDF olarak dışa aktarın.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/hesaplarim/calisanlar"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-800"
          >
            ← Çalışanlar
          </Link>
        </div>
      </div>

      {/* Rapor kriterleri */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-slate-200/40">
        <button
          type="button"
          onClick={() => setCriteriaOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-left text-sm font-bold uppercase tracking-widest text-white"
        >
          <span>Rapor kriterleri</span>
          {criteriaOpen ? (
            <ChevronUp className="h-5 w-5 shrink-0 opacity-90" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 opacity-90" />
          )}
        </button>
        {criteriaOpen && (
          <div className="flex flex-col gap-5 border-t border-gray-100 bg-gray-50/50 p-5 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[220px] flex-1 sm:max-w-xs">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Durumu
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={handlePrepareReport}
              className="h-12 gap-2 rounded-xl bg-rose-600 px-8 text-sm font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700"
            >
              <Zap className="h-4 w-4" />
              Raporu hazırla
            </Button>
          </div>
        )}
      </div>

      {/* Rapor sonucu */}
      {reportReady && (
        <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-slate-200/40">
          <button
            type="button"
            onClick={() => setResultOpen((v) => !v)}
            className="flex w-full shrink-0 items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-left text-sm font-bold uppercase tracking-widest text-white"
          >
            <span>Rapor sonucu</span>
            {resultOpen ? (
              <ChevronUp className="h-5 w-5 shrink-0 opacity-90" />
            ) : (
              <ChevronDown className="h-5 w-5 shrink-0 opacity-90" />
            )}
          </button>
          {resultOpen && (
            <div className="flex w-full min-w-0 flex-col gap-3 border-t border-gray-100 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:gap-4 sm:p-6">
              <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-500">
                  <span className="font-bold tabular-nums text-gray-900">{displayRows.length}</span>{' '}
                  kayıt listeleniyor
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition hover:bg-amber-600"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>

              <p className="shrink-0 text-xs text-gray-400">
                Her alan <strong className="font-medium text-gray-500">tek satırdadır</strong>. Tüm sütunları{' '}
                <strong className="font-medium text-gray-500">yatay kaydırarak</strong>, çok sayıda kaydı{' '}
                <strong className="font-medium text-gray-500">dikey kaydırarak</strong> inceleyebilirsiniz.
              </p>

              <p className="shrink-0 border-b border-gray-100 pb-3 text-center text-xs text-gray-500">
                Çalışan raporu ·{' '}
                {new Date().toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              <div
                className="relative isolate w-full min-w-0 max-w-full max-h-[min(70vh,calc(100dvh-20rem))] overflow-x-auto overflow-y-auto scroll-smooth rounded-xl border border-gray-200 bg-white shadow-inner ring-1 ring-slate-100 [-webkit-overflow-scrolling:touch] overscroll-x-contain overscroll-y-contain"
              >
                <table
                  lang="tr"
                  className="w-max table-auto border-collapse text-sm leading-none text-gray-800"
                >
                  <thead className="[&_tr]:shadow-sm">
                    <tr>
                      {REPORT_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          scope="col"
                          title={col.headerTitle ?? col.label}
                          className="sticky top-0 z-20 whitespace-nowrap border-b border-gray-200 bg-gray-100 px-3 py-3 text-left align-middle shadow-[0_1px_0_0_rgb(226,232,240)] backdrop-blur-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="group inline-flex max-w-none items-center gap-1.5 whitespace-nowrap text-left text-xs font-semibold normal-case tracking-normal text-gray-600 transition hover:text-emerald-800"
                          >
                            <span className="leading-none">{col.label}</span>
                            <span className="shrink-0 text-gray-500 group-hover:text-emerald-600">
                              {sortKey === col.key ? (
                                sortDir === 'asc' ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                              )}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={REPORT_COLUMNS.length}
                          className="px-6 py-16 text-center text-sm text-gray-400"
                        >
                          Bu kritere uygun kayıt yok.
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`transition-colors hover:bg-emerald-50/50 ${
                            idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'
                          }`}
                        >
                          {REPORT_COLUMNS.map((col) => {
                            const raw = row[col.key]
                            const empty = isCellEmpty(raw)
                            return (
                              <td
                                key={col.key}
                                className={`whitespace-nowrap border-b border-gray-100 px-3 align-middle text-gray-800 ${
                                  empty ? 'py-2' : 'py-2.5'
                                }`}
                              >
                                <ReportDataCell col={col} raw={raw} />
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
