'use client'

import { useState, useEffect } from 'react'
import { Upload, Download, X, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { normHeader } from '@/lib/excel-import/norm'
import { parseFirstSheetToRecords, mapRowsByAliases } from '@/lib/excel-import/parseWorkbook'
import { productAliasMap, mapProductRow, type ProductRefLists } from '@/lib/excel-import/productMap'
import { cariAliasMap, mapCariRow } from '@/lib/excel-import/cariMap'
import { downloadProductImportTemplate, downloadCariImportTemplate } from '@/lib/excel-import/templates'

export type ExcelImportKind = 'products' | 'customers' | 'suppliers'

type PreparedRow = {
  index: number
  summary: string
  payload?: Record<string, unknown>
  error?: string
}

type Props = {
  open: boolean
  onClose: () => void
  kind: ExcelImportKind
  productRefs?: ProductRefLists
  brands?: { name: string }[]
  sampleCategory1?: string[]
  sampleCategory2?: string[]
  onSuccess: () => void
}

export function ExcelBulkImportModal({
  open,
  onClose,
  kind,
  productRefs,
  brands = [],
  sampleCategory1 = [],
  sampleCategory2 = [],
  onSuccess,
}: Props) {
  const [prepared, setPrepared] = useState<PreparedRow[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) {
      setPrepared([])
      setImporting(false)
    }
  }, [open])

  const handleDownloadTemplate = () => {
    try {
      if (kind === 'products' && productRefs) {
        downloadProductImportTemplate(productRefs, brands)
        toast.success('Şablon indirildi')
      } else if (kind === 'customers') {
        downloadCariImportTemplate('customers', sampleCategory1, sampleCategory2)
        toast.success('Şablon indirildi')
      } else if (kind === 'suppliers') {
        downloadCariImportTemplate('suppliers', sampleCategory1, sampleCategory2)
        toast.success('Şablon indirildi')
      }
    } catch (e: any) {
      toast.error(e.message || 'Şablon oluşturulamadı')
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      toast.error('Yalnızca .xlsx veya .xls yükleyin')
      return
    }

    try {
      const buf = await file.arrayBuffer()
      const rawAll = parseFirstSheetToRecords(buf)
      const raw = rawAll.filter((row) =>
        Object.values(row).some((v) => String(v ?? '').trim() !== '')
      )
      if (raw.length === 0) {
        toast.error('İlk sayfada veri yok')
        return
      }

      if (kind === 'products') {
        if (!productRefs) {
          toast.error('Tanımlar yüklenemedi')
          return
        }
        const aliasMap = productAliasMap()
        const firstKeys = Object.keys(raw[0] || {})
        const matched = firstKeys.filter((k) => aliasMap.has(normHeader(k))).length
        if (matched === 0) {
          toast.error('Sütun başlıkları tanınmadı. Şablondaki ilk satırı silmeyin veya aynı başlıkları kullanın.')
          return
        }

        const mapped = mapRowsByAliases(raw, aliasMap)
        const out: PreparedRow[] = []
        mapped.forEach((row, i) => {
          const r = mapProductRow(row as Record<string, unknown>, productRefs)
          const summary = String(row.name ?? '').trim() || `Satır ${i + 2}`
          if (r.ok) {
            out.push({ index: i + 2, summary, payload: r.payload })
          } else {
            out.push({ index: i + 2, summary, error: r.error })
          }
        })
        setPrepared(out)
        const ok = out.filter((x) => x.payload).length
        const bad = out.length - ok
        if (bad > 0) {
          toast(`${ok} satır hazır, ${bad} satırda hata var`, { icon: '⚠️' })
        } else {
          toast.success(`${ok} satır içe aktarıma hazır`)
        }
      } else {
        const aliasMap = cariAliasMap()
        const firstKeys = Object.keys(raw[0] || {})
        const matched = firstKeys.filter((k) => aliasMap.has(normHeader(k))).length
        if (matched === 0) {
          toast.error('Sütun başlıkları tanınmadı. Şablonu kullanın.')
          return
        }
        const mapped = mapRowsByAliases(raw, aliasMap)
        const out: PreparedRow[] = []
        mapped.forEach((row, i) => {
          const r = mapCariRow(row as Record<string, unknown>)
          const summary = String(row.company_name ?? '').trim() || `Satır ${i + 2}`
          if (r.ok) {
            out.push({ index: i + 2, summary, payload: r.payload })
          } else {
            out.push({ index: i + 2, summary, error: r.error })
          }
        })
        setPrepared(out)
        const ok = out.filter((x) => x.payload).length
        const bad = out.length - ok
        if (bad > 0) {
          toast(`${ok} satır hazır, ${bad} satırda hata var`, { icon: '⚠️' })
        } else {
          toast.success(`${ok} satır içe aktarıma hazır`)
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Dosya okunamadı')
    }
  }

  const runImport = async () => {
    const items = prepared.filter((p) => p.payload).map((p) => p.payload!)
    if (items.length === 0) {
      toast.error('Aktarılacak geçerli satır yok')
      return
    }

    const endpoint =
      kind === 'products'
        ? '/api/bulk-import/products'
        : kind === 'customers'
          ? '/api/bulk-import/customers'
          : '/api/bulk-import/suppliers'

    setImporting(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İstek başarısız')

      const { okCount, failCount, results } = data
      if (failCount > 0) {
        toast.error(`${okCount} kayıt eklendi, ${failCount} satır veritabanında reddedildi (ör. yinelenen barkod). Konsol / ağ yanıtına bakın.`)
        if (okCount > 0) onSuccess()
      } else {
        toast.success(`${okCount} kayıt eklendi`)
        onSuccess()
        onClose()
      }
    } catch (e: any) {
      toast.error(e.message || 'İçe aktarma başarısız')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  const title =
    kind === 'products' ? 'Excel ile ürün içe aktar' : kind === 'customers' ? 'Excel ile müşteri içe aktar' : 'Excel ile tedarikçi içe aktar'

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700">
          <div className="flex items-center gap-3 text-white">
            <FileSpreadsheet className="h-6 w-6" />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/15 text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Önce şablonu indirin; Kategoriler, Depolar ve Raf yerleri sistemdeki tanımlarla doludur.</li>
            <li>Ürünler / Müşteriler sayfasında verileri doldurun; başlık satırını değiştirmeyin.</li>
            <li>Dosyayı seçin, önizlemeyi kontrol edin ve içe aktarın.</li>
          </ol>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Şablon indir
            </Button>
            <label className="inline-flex items-center justify-center h-11 px-5 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-700 cursor-pointer shadow-md transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Excel seç
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {prepared.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Önizleme (ilk 40 satır)</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Satır</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Özet</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prepared.slice(0, 40).map((p) => (
                      <tr key={p.index} className={p.error ? 'bg-red-50/50' : ''}>
                        <td className="px-3 py-2 font-mono text-gray-500">{p.index}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[200px]">{p.summary}</td>
                        <td className="px-3 py-2">
                          {p.error ? <span className="text-red-600 font-semibold">{p.error}</span> : <span className="text-emerald-600 font-bold">Tamam</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {prepared.length > 40 && <p className="text-[11px] text-gray-500">+{prepared.length - 40} satır daha…</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={importing}>
                  Kapat
                </Button>
                <Button
                  type="button"
                  className="rounded-xl font-bold"
                  onClick={runImport}
                  disabled={importing || prepared.every((p) => !p.payload)}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aktarılıyor…
                    </>
                  ) : (
                    `İçe aktar (${prepared.filter((p) => p.payload).length} kayıt)`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
