/**
 * Satış / alış belgesi PDF'i — e-fatura stiline yakın layout.
 * Roboto fontu ile Türkçe karakter desteği (Ş, ğ, ı, İ vb.).
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { lineMatrah, roundMoney } from '@/lib/vat-breakdown'
import { registerTurkishFont } from '@/lib/pdfFontLoader'

/* ─── Interface'ler ─── */

export interface TenantPdfProfile {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  tax_office?: string | null
  tax_number?: string | null
  mersis_no?: string | null
  trade_registry_no?: string | null
}

export interface CounterpartyPdfProfile {
  company_name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  tax_office?: string | null
  tax_number?: string | null
}

export interface TradePdfLineItem {
  sku?: string | null
  name: string
  unit?: string | null
  quantity: number
  unit_price: number
  total_price: number
  vat_rate?: number | null
}

export interface TradePdfMeta {
  kind: 'sale' | 'purchase'
  documentNo: string
  orderNo?: string | null
  dateISO: string
  description?: string | null
}

export interface TradePdfTotals {
  matrah: number
  kdv: number
  brut: number
}

/* ─── Yardımcılar ─── */

function fmtMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function lineKdvParts(item: TradePdfLineItem) {
  const mat = lineMatrah(item)
  const kdv = roundMoney(Number(item.total_price) - mat)
  const rateFromField =
    item.vat_rate != null && Number(item.vat_rate) > 0 ? Number(item.vat_rate) : null
  const ratePct =
    rateFromField != null
      ? roundMoney(rateFromField)
      : mat > 0.0001
        ? roundMoney((kdv / mat) * 100)
        : 0
  return { matrah: mat, kdv, ratePct }
}

function s(v: string | null | undefined): string {
  return (v ?? '').trim()
}

/* ─── Taraf bilgi kutusu ─── */

interface PartyBlock {
  displayName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  tax_office?: string | null
  tax_number?: string | null
  mersis_no?: string | null
  trade_registry_no?: string | null
}

function tenantToBlock(t: TenantPdfProfile): PartyBlock {
  return {
    displayName: t.name,
    address: t.address,
    phone: t.phone,
    email: t.email,
    website: t.website,
    tax_office: t.tax_office,
    tax_number: t.tax_number,
    mersis_no: t.mersis_no,
    trade_registry_no: t.trade_registry_no,
  }
}

function counterpartyToBlock(c: CounterpartyPdfProfile): PartyBlock {
  return {
    displayName: c.company_name,
    address: c.address,
    phone: c.phone,
    email: c.email,
    tax_office: c.tax_office,
    tax_number: c.tax_number,
  }
}

function drawPartyBox(
  doc: jsPDF,
  x: number,
  y: number,
  maxW: number,
  title: string,
  party: PartyBlock
): number {
  let yy = y

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120)
  doc.text(title, x, yy)
  yy += 4.5

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(25, 25, 25)
  const nameLines = doc.splitTextToSize(party.displayName, maxW)
  doc.text(nameLines, x, yy)
  yy += nameLines.length * 4.5 + 1

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)

  if (s(party.address)) {
    const addrLines = doc.splitTextToSize(s(party.address), maxW)
    doc.text(addrLines, x, yy)
    yy += addrLines.length * 3.5
  }

  const details: [string, string, boolean][] = [
    ['Tel', s(party.phone), false],
    ['E-Posta', s(party.email), false],
    ['Web', s(party.website), false],
    ['Vergi Dairesi', s(party.tax_office), true],
    ['VKN / TCKN', s(party.tax_number), true],
    ['Ticari Sicil No', s(party.trade_registry_no), false],
    ['MERSİS No', s(party.mersis_no), false],
  ]

  for (const [label, val, required] of details) {
    if (!val && !required) continue
    const displayVal = val || '—'
    doc.setFont('Roboto', 'bold')
    doc.text(`${label}: `, x, yy)
    const labelW = doc.getTextWidth(`${label}: `)
    doc.setFont('Roboto', 'normal')
    const valLines = doc.splitTextToSize(displayVal, maxW - labelW)
    doc.text(valLines, x + labelW, yy)
    yy += valLines.length * 3.5
  }

  return yy + 4
}

/* ─── Ana fonksiyon ─── */

export async function openTradeDocumentPdf(
  meta: TradePdfMeta,
  upperParty: TenantPdfProfile | CounterpartyPdfProfile,
  lowerParty: TenantPdfProfile | CounterpartyPdfProfile,
  items: TradePdfLineItem[],
  totals: TradePdfTotals
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await registerTurkishFont(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ml = 14
  const mr = 14
  const contentW = pageW - ml - mr
  const isSale = meta.kind === 'sale'

  /* ── 1. Başlık ── */
  let y = 16
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text(isSale ? 'SATIŞ BELGESİ' : 'ALIŞ BELGESİ', ml, y)
  y += 7

  /* ── 2. Sağ üst belge bilgi kutusu ── */
  const boxW = 68
  const boxX = pageW - mr - boxW
  const boxTop = 11
  doc.setDrawColor(170)
  doc.setLineWidth(0.25)
  doc.rect(boxX, boxTop, boxW, 30)

  const metaRows: [string, string][] = [
    ['Belge Tipi', isSale ? 'SATIŞ' : 'ALIŞ'],
    ['Belge No', meta.documentNo || '—'],
    ['Tarih', fmtDate(meta.dateISO)],
    ['Saat', fmtTime(meta.dateISO)],
  ]
  if (meta.orderNo?.trim()) {
    metaRows.push(['Sipariş No', meta.orderNo.trim()])
  }

  let metaY = boxTop + 4.5
  doc.setFontSize(7.5)
  for (const [k, v] of metaRows) {
    doc.setFont('Roboto', 'bold')
    doc.setTextColor(80)
    doc.text(k, boxX + 2.5, metaY)
    doc.setFont('Roboto', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(v, boxX + 30, metaY)
    metaY += 4.5
  }

  /* ── 3. Taraf kutuları (sol yarı) ── */
  const partyW = contentW * 0.62

  const upper =
    'name' in upperParty
      ? tenantToBlock(upperParty as TenantPdfProfile)
      : counterpartyToBlock(upperParty as CounterpartyPdfProfile)
  const lower =
    'name' in lowerParty
      ? tenantToBlock(lowerParty as TenantPdfProfile)
      : counterpartyToBlock(lowerParty as CounterpartyPdfProfile)

  const upperTitle = isSale ? 'SATICI' : 'TEDARİKÇİ'
  const lowerTitle = isSale ? 'ALICI' : 'ALICI (İŞLETMENİZ)'

  y = drawPartyBox(doc, ml, y, partyW, upperTitle, upper)
  y += 1

  doc.setDrawColor(210)
  doc.setLineWidth(0.15)
  doc.line(ml, y, ml + partyW, y)
  y += 4

  y = drawPartyBox(doc, ml, y, partyW, lowerTitle, lower)
  y += 2

  /* ── 4. Kalem tablosu ── */
  const tableBody = items.map((item, idx) => {
    const { matrah, kdv, ratePct } = lineKdvParts(item)
    const qtyStr = `${Number(item.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${(item.unit || 'Adet').toUpperCase()}`
    return [
      String(idx + 1),
      item.sku || '—',
      item.name,
      qtyStr,
      fmtMoney(item.unit_price),
      `%${ratePct.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`,
      fmtMoney(kdv),
      fmtMoney(Number(item.total_price)),
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [[
      'Sıra',
      'Kod',
      'Malzeme / Hizmet',
      'Miktar',
      'Birim Fiyat',
      'KDV %',
      'KDV Tutarı',
      'Toplam',
    ]],
    body: tableBody,
    styles: {
      font: 'Roboto',
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
      textColor: [30, 30, 30],
      lineColor: [210, 210, 210],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [50, 60, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 17 },
      2: { cellWidth: 44 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 26, halign: 'right' },
    },
    margin: { left: ml, right: mr },
  })

  type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }
  let sy = ((doc as DocWithTable).lastAutoTable?.finalY ?? y + 40) + 8

  /* ── 5. Toplam özeti (sağ alt) ── */
  const sumLabelX = pageW - mr - 90
  const sumValX = pageW - mr

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60)

  doc.text('Mal / Hizmet Toplamı (KDV Hariç)', sumLabelX, sy)
  doc.setTextColor(30, 30, 30)
  doc.text(fmtMoney(totals.matrah), sumValX, sy, { align: 'right' })
  sy += 5.5

  doc.setTextColor(60)
  doc.text('Hesaplanan KDV', sumLabelX, sy)
  doc.setTextColor(30, 30, 30)
  doc.text(fmtMoney(totals.kdv), sumValX, sy, { align: 'right' })
  sy += 5.5

  doc.setDrawColor(170)
  doc.setLineWidth(0.3)
  doc.line(sumLabelX, sy - 2, sumValX, sy - 2)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Vergiler Dahil Toplam', sumLabelX, sy + 2)
  doc.text(fmtMoney(totals.brut), sumValX, sy + 2, { align: 'right' })
  sy += 8

  doc.setFontSize(11)
  doc.text('Ödenecek Tutar', sumLabelX, sy + 2)
  doc.text(fmtMoney(totals.brut), sumValX, sy + 2, { align: 'right' })
  sy += 12

  /* ── 6. Not alanı (sayfanın altına yakın) ── */
  if (s(meta.description)) {
    const noteY = Math.max(sy + 4, pageH - 55)

    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.line(ml, noteY - 3, pageW - mr, noteY - 3)

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text('NOTLAR', ml, noteY + 1)

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    const noteLines = doc.splitTextToSize(s(meta.description), contentW)
    doc.text(noteLines, ml, noteY + 5.5)
  }

  /* ── 7. Alt bilgi ── */
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(140)
  doc.text(
    'Bu belge bilgi amaçlıdır; e-Fatura / e-Arşiv yerine geçmez.',
    ml,
    pageH - 8
  )

  /* ── PDF aç ── */
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const win = window.open(url)
  if (win) {
    win.onload = () => URL.revokeObjectURL(url)
  }
}
