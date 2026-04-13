/**
 * Türkçe para/sayı girişi: binlik ayırıcı nokta (.), ondalık virgül (,).
 * Tam kısımda 4 veya daha fazla rakam varsa binliklere nokta konur (örn. 1000 → 1.000).
 */

/** Tam sayı kısmına binlik noktaları ekler (en az 4 rakam olduğunda anlamlı). */
export function formatTrIntegerPart(digitsOnly: string): string {
  const d = digitsOnly.replace(/\D/g, '')
  if (d === '') return ''
  const noLeadingZeros = d.replace(/^0+(\d)/, '$1')
  const intDigits = noLeadingZeros === '' ? '0' : noLeadingZeros
  if (intDigits.length < 4) return intDigits
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Kullanıcı girişini normalize eder (yazarken).
 * İzin: rakamlar, tek virgül (ondalık), başta eksi.
 */
export function normalizeTrNumberInput(raw: string): string {
  let s = raw.replace(/[^\d,.-]/g, '')
  const neg = s.startsWith('-')
  if (neg) s = s.slice(1)

  const commaIdx = s.indexOf(',')
  let intRaw: string
  let decRaw: string
  if (commaIdx >= 0) {
    intRaw = s.slice(0, commaIdx).replace(/[^\d]/g, '')
    decRaw = s.slice(commaIdx + 1).replace(/[^\d]/g, '').slice(0, 8)
  } else {
    intRaw = s.replace(/\./g, '').replace(/[^\d]/g, '')
    decRaw = ''
  }

  const intFormatted = formatTrIntegerPart(intRaw)
  if (decRaw.length > 0) {
    return `${neg ? '-' : ''}${intFormatted},${decRaw}`
  }
  return `${neg ? '-' : ''}${intFormatted}`
}

/** Görüntü stringinden sayı (API / hesaplama için). */
export function parseTrNumberInput(display: string): number {
  const t = String(display ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : NaN
}

/** Sayıyı giriş alanında göstermek için (başlangıç değeri). */
export function numberToTrInputString(n: number, maxFractionDigits = 10): string {
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('tr-TR', {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: true,
  })
}

/**
 * API / ham değer → giriş gösterimi (JSON ondalık "12345.67" veya TR "12.345,67").
 */
export function looseToTrInputString(
  value: string | number | null | undefined,
  maxFractionDigits = 10
): string {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? numberToTrInputString(value, maxFractionDigits) : ''
  }
  const s = String(value).trim()
  if (!s) return ''
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    return Number.isFinite(n) ? numberToTrInputString(n, maxFractionDigits) : ''
  }
  const n = parseTrNumberInput(normalizeTrNumberInput(s))
  return Number.isFinite(n) ? numberToTrInputString(n, maxFractionDigits) : ''
}

/**
 * Satış/alış satırı modalunda: odakta sıfır veya tipik varsayılan değerleri sil (yeniden yazmayı kolaylaştırır).
 * Diğer durumlarda false döner; çağıran `select()` ile tümünü seçebilir.
 */
export function shouldClearTrLineFieldOnFocus(
  raw: string,
  kind: 'unit_price' | 'quantity' | 'tax_rate' | 'discount_rate'
): boolean {
  const t = String(raw ?? '').trim()
  if (t === '') return false
  const n = parseTrNumberInput(t)
  if (!Number.isFinite(n)) return false
  switch (kind) {
    case 'unit_price':
    case 'discount_rate':
      return n === 0
    case 'quantity':
      return n === 0 || n === 1
    case 'tax_rate':
      return n === 0 || n === 20
    default:
      return false
  }
}
