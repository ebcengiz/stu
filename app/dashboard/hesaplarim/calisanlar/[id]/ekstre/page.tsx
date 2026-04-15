'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Zap,
  FileSpreadsheet,
  FileText,
  Mail,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

type CariTx = {
  id: string
  entry_type: string
  signed_amount: number
  currency: string
  description: string | null
  transaction_date: string
  created_at?: string
}

function parseDay(iso: string): number {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function dayFromInput(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function formatMoney(n: number, currency: string) {
  const s = Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  const neg = n < 0 ? '-' : ''
  if (currency === 'USD') return `${neg}$${s}`
  if (currency === 'EUR') return `${neg}€${s}`
  return `${neg}${s}`
}

export default function CalisanEkstrePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [allTx, setAllTx] = useState<CariTx[]>([])
  const [loading, setLoading] = useState(true)

  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 2)
    return d.toISOString().slice(0, 10)
  }, [])

  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(defaultTo)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch(`/api/employees/${id}/cari`),
      ])
      if (!r1.ok) {
        toast.error('Çalışan bulunamadı')
        router.push('/dashboard/hesaplarim/calisanlar')
        return
      }
      const e = await r1.json()
      setName(e.name || 'Çalışan')
      setCurrency(e.currency || 'TRY')

      if (r2.ok) {
        const c = await r2.json()
        setAllTx(Array.isArray(c.transactions) ? c.transactions : [])
      } else {
        setAllTx([])
      }
    } catch {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  const prepared = useMemo(() => {
    const sorted = [...allTx].sort((a, b) => {
      const ta = new Date(a.transaction_date).getTime()
      const tb = new Date(b.transaction_date).getTime()
      if (ta !== tb) return ta - tb
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0
      return ca - cb
    })

    const fromT = dayFromInput(appliedFrom)
    const toT = dayFromInput(appliedTo)

    let opening = 0
    for (const t of sorted) {
      const txDay = parseDay(t.transaction_date)
      if (txDay < fromT) {
        opening += Number(t.signed_amount)
      }
    }

    const inRange: { tx: CariTx; borc: number; alacak: number }[] = []
    for (const t of sorted) {
      const txDay = parseDay(t.transaction_date)
      if (txDay < fromT || txDay > toT) continue
      const amt = Number(t.signed_amount)
      inRange.push({
        tx: t,
        borc: amt > 0 ? amt : 0,
        alacak: amt < 0 ? Math.abs(amt) : 0,
      })
    }

    let run = opening
    const rows = inRange.map((r) => {
      run += Number(r.tx.signed_amount)
      return { ...r, balance: run }
    })

    const totalBorc = inRange.reduce((s, r) => s + r.borc, 0)
    const totalAlacak = inRange.reduce((s, r) => s + r.alacak, 0)

    return { rows, opening, totalBorc, totalAlacak, closing: run }
  }, [allTx, appliedFrom, appliedTo])

  const handlePrepare = () => {
    if (dayFromInput(dateFrom) > dayFromInput(dateTo)) {
      toast.error('Başlangıç tarihi bitişten sonra olamaz')
      return
    }
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }

  const handleExcel = () => {
    const lines = [
      ['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'].join(';'),
      ...prepared.rows.map((r) =>
        [
          new Date(r.tx.transaction_date).toLocaleDateString('tr-TR'),
          (r.tx.description || '').replace(/;/g, ','),
          r.borc ? String(r.borc).replace('.', ',') : '',
          r.alacak ? String(r.alacak).replace('.', ',') : '',
          String(r.balance).replace('.', ','),
        ].join(';')
      ),
      [
        'TOPLAM',
        '',
        String(prepared.totalBorc).replace('.', ','),
        String(prepared.totalAlacak).replace('.', ','),
        String(prepared.closing).replace('.', ','),
      ].join(';'),
    ]
    const blob = new Blob(['\ufeff' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hesap-ekstresi-${name.replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV indirildi (Excel ile açılabilir)')
  }

  const handlePdf = () => {
    toast('PDF çıktısı yakında eklenecek', { icon: '📄' })
  }

  const handleSend = () => {
    toast('E-posta gönderimi yakında eklenecek', { icon: '✉️' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-gray-200 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const title = `${name.toLocaleUpperCase('tr-TR')} HESAP EKSTRESİ`

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        <Link
          href={`/dashboard/hesaplarim/calisanlar/${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-800 hover:bg-primary-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </Link>

        <div className="rounded-lg overflow-hidden shadow-md border border-gray-200/20">
          <div className="bg-white px-5 py-4">
            <h1 className="text-lg md:text-xl font-black text-white tracking-tight text-center">
              {title}
            </h1>
          </div>

          <div className="bg-white p-5 space-y-4 border-x border-b border-gray-200 rounded-b-lg">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-600">Tarih Aralığı</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
                  />
                  <span className="text-gray-500 font-medium">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrepare}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-sm font-black shadow-sm"
              >
                <Zap className="h-4 w-4" />
                Raporu Hazırla
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleExcel}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-bold shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
              <button
                type="button"
                onClick={handlePdf}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-bold shadow-sm"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 rounded-lg bg-white hover:bg-[#F5F5F0] text-white px-4 py-2 text-sm font-bold shadow-sm"
              >
                <Mail className="h-4 w-4" />
                Gönder
              </button>
            </div>
          </div>
        </div>

        {prepared.opening !== 0 && (
          <p className="text-sm text-gray-600 px-1">
            <span className="font-bold text-gray-800">Dönem öncesi bakiye:</span>{' '}
            {formatMoney(prepared.opening, currency)}
          </p>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-primary-100 border-b border-gray-200">
                  <th className="text-left font-black text-gray-800 px-4 py-3">Tarih</th>
                  <th className="text-left font-black text-gray-800 px-4 py-3">Açıklama</th>
                  <th className="text-right font-black text-gray-800 px-4 py-3 whitespace-nowrap">
                    Borç
                  </th>
                  <th className="text-right font-black text-gray-800 px-4 py-3 whitespace-nowrap">
                    Alacak
                  </th>
                  <th className="text-right font-black text-gray-800 px-4 py-3 whitespace-nowrap">
                    Bakiye
                  </th>
                </tr>
              </thead>
              <tbody>
                {prepared.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-gray-500 italic"
                    >
                      Seçilen tarih aralığında hareket yok.
                    </td>
                  </tr>
                ) : (
                  prepared.rows.map((r) => (
                    <tr key={r.tx.id} className="border-b border-gray-200 hover:bg-gray-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                        {new Date(r.tx.transaction_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-gray-800 max-w-md">
                        {r.tx.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {r.borc > 0 ? formatMoney(r.borc, currency) : ''}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {r.alacak > 0 ? formatMoney(r.alacak, currency) : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                        {formatMoney(r.balance, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {prepared.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-primary-50/80 border-t-2 border-gray-300 font-bold">
                    <td colSpan={2} className="px-4 py-3 text-gray-800">
                      Toplam
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {formatMoney(prepared.totalBorc, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {formatMoney(prepared.totalAlacak, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {formatMoney(prepared.closing, currency)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
