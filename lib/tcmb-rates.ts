/**
 * TCMB günlük döviz kurları (today.xml).
 * @see https://www.tcmb.gov.tr/kurlar/today.xml
 */

export type TcmbRates = {
  bulletinDate: string
  /** 1 USD kaç TL (ForexBuying) */
  usdTry: number
  /** 1 EUR kaç TL (ForexBuying) */
  eurTry: number
}

const TCMB_TODAY = 'https://www.tcmb.gov.tr/kurlar/today.xml'

let cache: { at: number; rates: TcmbRates } | null = null
const CACHE_MS = 60 * 60 * 1000

function parseTcmbXml(xml: string): TcmbRates | null {
  const dateM = xml.match(/Tarih="([^"]+)"/)
  const bulletinDate = dateM?.[1]?.trim() ?? ''

  function forexFor(code: string): number | null {
    const idx = xml.indexOf(`Kod="${code}"`)
    if (idx < 0) return null
    const slice = xml.slice(idx, idx + 1200)
    const buy = slice.match(/<ForexBuying>([\d.]+)<\/ForexBuying>/)
    if (!buy?.[1]) return null
    const n = parseFloat(buy[1].replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const usd = forexFor('USD')
  const eur = forexFor('EUR')
  if (usd == null || eur == null) return null
  return { bulletinDate, usdTry: usd, eurTry: eur }
}

export async function getTcmbRates(): Promise<{ ok: true; rates: TcmbRates } | { ok: false; error: string }> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) {
    return { ok: true, rates: cache.rates }
  }

  try {
    const res = await fetch(TCMB_TODAY, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/xml,text/xml' },
    })
    if (!res.ok) {
      return { ok: false, error: `TCMB yanıtı: ${res.status}` }
    }
    const xml = await res.text()
    const parsed = parseTcmbXml(xml)
    if (!parsed) {
      return { ok: false, error: 'TCMB XML ayrıştırılamadı' }
    }
    cache = { at: now, rates: parsed }
    return { ok: true, rates: parsed }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ağ hatası'
    return { ok: false, error: msg }
  }
}

/** Tutarı TRY'ye çevir (TCMB kur tabanı). */
export function toTryFromTcmb(amount: number, currency: string | null | undefined, tcmb: TcmbRates): number {
  const c = String(currency || 'TRY').toUpperCase()
  if (!Number.isFinite(amount)) return 0
  if (c === 'TRY' || c === 'TL') return amount
  if (c === 'USD') return amount * tcmb.usdTry
  if (c === 'EUR') return amount * tcmb.eurTry
  return amount
}
