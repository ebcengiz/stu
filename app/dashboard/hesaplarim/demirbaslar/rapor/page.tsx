'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type AssetRow = {
  id: string
  name: string
  description: string | null
  serial_no: string | null
  purchase_date: string | null
  price: number | string | null
  currency: string
}

function formatMoney(n: number | string | null | undefined, cur: string) {
  if (n == null || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(num)) return '—'
  const s = num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  return cur === 'TRY' ? `${s} ₺` : `${s} ${cur}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  return d.toLocaleDateString('tr-TR')
}

export default function DemirbaslarRaporPage() {
  const [rows, setRows] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/fixed-assets')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Yüklenemedi')
      setRows(Array.isArray(j.assets) ? j.assets : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const exportExcel = () => {
    if (rows.length === 0) {
      toast.error('Dışa aktarılacak kayıt yok')
      return
    }
    const data = rows.map((r) => ({
      'Demirbaş adı': r.name,
      Açıklama: r.description ?? '',
      'Seri / plaka': r.serial_no ?? '',
      'Alış tarihi': formatDate(r.purchase_date),
      Fiyat: r.price != null && r.price !== '' ? Number(r.price) : '',
      'Para birimi': r.currency || 'TRY',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Demirbaşlar')
    XLSX.writeFile(wb, `demirbaslar-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel indirildi')
  }

  const exportPdf = () => {
    if (rows.length === 0) {
      toast.error('Kayıt yok')
      return
    }
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Demirbaşlar Raporu', 14, 18)
    doc.setFontSize(9)
    doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, 14, 26)

    const body = rows.map((r) => [
      r.name,
      (r.description ?? '').replace(/\n/g, ' '),
      r.serial_no ?? '—',
      formatDate(r.purchase_date),
      formatMoney(r.price, r.currency || 'TRY'),
    ])

    autoTable(doc, {
      startY: 32,
      head: [['Demirbaş adı', 'Açıklama', 'Seri / plaka', 'Alış tarihi', 'Fiyat']],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95] },
    })

    doc.save(`demirbaslar-rapor-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF indirildi')
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/hesaplarim/demirbaslar"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Demirbaşlara dön
        </Link>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            PDF
          </button>
        </div>
      </div>

      <div className="print:block">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Demirbaşlar — Rapor</h1>
        <p className="mt-1 text-sm text-gray-400">
          Tüm demirbaş kayıtları; alış tarihi ve fiyat isteğe bağlı alanlardır.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz demirbaş kaydı yok.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md print:shadow-none print:border-gray-400">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-left text-xs font-bold uppercase tracking-wide text-white print:bg-gray-100 print:text-white">
                  <th className="px-3 py-2.5">Demirbaş adı</th>
                  <th className="px-3 py-2.5">Açıklama</th>
                  <th className="px-3 py-2.5">Seri / plaka</th>
                  <th className="px-3 py-2.5">Alış tarihi</th>
                  <th className="px-3 py-2.5">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} print:break-inside-avoid`}
                  >
                    <td className="px-3 py-2 align-top font-medium text-gray-900">{r.name}</td>
                    <td className="max-w-md px-3 py-2 align-top whitespace-pre-wrap text-gray-600">
                      {r.description?.trim() || '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-gray-600">{r.serial_no?.trim() || '—'}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{formatDate(r.purchase_date)}</td>
                    <td className="px-3 py-2 align-top text-gray-900">{formatMoney(r.price, r.currency || 'TRY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 print:hidden">{new Date().getFullYear()} © Mikro Muhasebe</p>
    </div>
  )
}
