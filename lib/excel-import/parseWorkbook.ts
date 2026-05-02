import * as XLSX from 'xlsx'
import { normHeader } from './norm'

/** İlk sayfayı başlık satırı + nesne dizisine çevirir */
export function parseFirstSheetToRecords(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const name = wb.SheetNames[0]
  if (!name) return []
  const sheet = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  return rows
}

/** Ham satırları normalize edilmiş alan anahtarlarına map eder */
export function mapRowsByAliases(
  rows: Record<string, unknown>[],
  aliasToField: Map<string, string>
): Record<string, unknown>[] {
  if (rows.length === 0) return []
  const first = rows[0]
  const headerMap = new Map<string, string>()
  for (const key of Object.keys(first)) {
    const field = aliasToField.get(normHeader(key))
    if (field) headerMap.set(key, field)
  }

  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [excelKey, val] of Object.entries(row)) {
      const f = headerMap.get(excelKey)
      if (f) out[f] = val
    }
    return out
  })
}
