/**
 * jsPDF'e Türkçe karakter destekli Roboto fontunu yükler.
 * Font dosyaları public/fonts/ altındadır; ilk yüklemede bellekte önbelleğe alınır.
 */

import { jsPDF } from 'jspdf'

let fontCache: { regular: string; bold: string } | null = null

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const chunks: string[] = []
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)))
  }
  return btoa(chunks.join(''))
}

async function ensureFontCache(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache

  const [regRes, boldRes] = await Promise.all([
    fetch('/fonts/Roboto-Regular.ttf'),
    fetch('/fonts/Roboto-Bold.ttf'),
  ])

  if (!regRes.ok || !boldRes.ok) {
    throw new Error('Font dosyaları yüklenemedi')
  }

  const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()])

  fontCache = {
    regular: arrayBufferToBase64(regBuf),
    bold: arrayBufferToBase64(boldBuf),
  }
  return fontCache
}

export async function registerTurkishFont(doc: jsPDF): Promise<void> {
  const cache = await ensureFontCache()

  doc.addFileToVFS('Roboto-Regular.ttf', cache.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  doc.addFileToVFS('Roboto-Bold.ttf', cache.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

  doc.setFont('Roboto', 'normal')
}
