/** Türkçe makbuz metni: tam ve kuruş (TRY) */

const birler = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz']
const onlar = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan']

function ucBasamak(n: number): string {
  const y = n % 1000
  if (y === 0) return ''
  const yuz = Math.floor(y / 100)
  const on = Math.floor((y % 100) / 10)
  const bi = y % 10
  const parts: string[] = []
  if (yuz > 0) {
    parts.push(yuz === 1 ? 'Yüz' : `${birler[yuz]} Yüz`)
  }
  if (on > 0) parts.push(onlar[on])
  if (bi > 0) parts.push(birler[bi])
  return parts.join(' ')
}

/** 0–999999999 arası tam sayıyı Türkçe okunuşa (para birimi olmadan) */
export function integerToTurkishWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'Sıfır'
  if (n >= 1e9) return 'Çok büyük tutar'

  const milyar = Math.floor(n / 1_000_000_000)
  const milyon = Math.floor((n % 1_000_000_000) / 1_000_000)
  const bin = Math.floor((n % 1_000_000) / 1000)
  const son = n % 1000

  const parcalar: string[] = []
  if (milyar > 0) {
    parcalar.push(milyar === 1 ? 'Bir Milyar' : `${ucBasamak(milyar)} Milyar`.trim())
  }
  if (milyon > 0) {
    parcalar.push(milyon === 1 ? 'Bir Milyon' : `${ucBasamak(milyon)} Milyon`.trim())
  }
  if (bin > 0) {
    parcalar.push(bin === 1 ? 'Bin' : `${ucBasamak(bin)} Bin`.trim())
  }
  if (son > 0 || n === 0) {
    const u = ucBasamak(son)
    if (u) parcalar.push(u)
  }

  return parcalar.join(' ').replace(/\s+/g, ' ').trim()
}

/** TRY için: Yalnız … Türk Lirası … Kuruş */
export function tryAmountToWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return ''
  const kurus = Math.round((amount - Math.floor(amount)) * 100)
  const lira = Math.floor(amount)
  let s = `Yalnız ${integerToTurkishWords(lira)} Türk Lirası`
  if (kurus > 0) {
    s += ` ${integerToTurkishWords(kurus)} Kuruş`
  }
  return s
}

/** Tutar girişi altında gösterim: boşluksuz küçük harf + para birimi (örn. #beşyüzbin TL#) */
function compactTurkishWords(n: number): string {
  return integerToTurkishWords(n)
    .toLowerCase()
    .replace(/\s+/g, '')
}

/**
 * Ödeme/tahsilat modallarında tutar alanının altı için tek satır metin.
 * TRY: Türkçe okunuş + TL/kuruş; USD/EUR: aynı sayı okunuşu + Dolar/Euro + Cent.
 */
export function paymentAmountInWordsLine(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount < 0) return ''
  const cur = String(currency || 'TRY').toUpperCase()
  const whole = Math.floor(amount)
  const cents = Math.round((amount - whole) * 100)

  if (cur === 'TRY') {
    let s = `${compactTurkishWords(whole)} TL`
    if (cents > 0) s += ` ${compactTurkishWords(cents)} kuruş`
    return `#${s}#`
  }
  if (cur === 'USD') {
    let s = `${compactTurkishWords(whole)} Dolar`
    if (cents > 0) s += ` ${compactTurkishWords(cents)} Cent`
    return `#${s}#`
  }
  if (cur === 'EUR') {
    let s = `${compactTurkishWords(whole)} Euro`
    if (cents > 0) s += ` ${compactTurkishWords(cents)} Cent`
    return `#${s}#`
  }
  return `#${compactTurkishWords(whole)} ${cur}#`
}
