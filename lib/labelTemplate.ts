/**
 * Etiket şablonları: Ayarlar sayfası ve ürün yazdırma aynı koordinat sistemini kullanmalı.
 * Önizlemede (CSS) konumlar kutunun sol-üst köşesine göre yüzdedir; PDF'de de aynı mantık için
 * sayfa boyutu yönle birlikte hesaplanır.
 */

export const LABEL_TEMPLATES_STORAGE_KEY = 'label_templates'

export interface LabelFieldPosition {
  x: number
  y: number
}

export interface LabelTemplate {
  id: string
  name: string
  type: 'product'
  orientation: 'horizontal' | 'vertical'
  width: number
  height: number
  marginLeft: number
  marginRight: number
  labelsPerRow: number
  gapX: number
  gapY: number
  fields: {
    productName: boolean
    productCode: boolean
    salePrice: boolean
    barcode: boolean
    tags: boolean
    description: boolean
    shelfLocation: boolean
    /** Yazdırma penceresinde girilen etiket adedi */
    printQuantity: boolean
    /** Ürün kartındaki koli içi adet (doluysa) */
    caseInnerQty: boolean
  }
  positions: Record<string, LabelFieldPosition>
}

const LABEL_POSITION_DEFAULTS: Record<string, LabelFieldPosition> = {
  productName: { x: 10, y: 8 },
  productCode: { x: 10, y: 25 },
  salePrice: { x: 10, y: 42 },
  barcode: { x: 10, y: 58 },
  tags: { x: 10, y: 75 },
  description: { x: 50, y: 8 },
  shelfLocation: { x: 50, y: 25 },
  printQuantity: { x: 68, y: 78 },
  caseInnerQty: { x: 10, y: 78 },
}

const LABEL_FIELD_DEFAULTS: LabelTemplate['fields'] = {
  productName: true,
  productCode: false,
  salePrice: false,
  barcode: false,
  tags: false,
  description: false,
  shelfLocation: false,
  printQuantity: true,
  caseInnerQty: false,
}

/** localStorage’taki eski şablonlara yeni alanları ve konumları ekler */
export function normalizeLabelTemplate(raw: any): LabelTemplate {
  const fields = { ...LABEL_FIELD_DEFAULTS, ...(raw?.fields || {}) }
  const positions = { ...LABEL_POSITION_DEFAULTS, ...(raw?.positions || {}) }
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? 'Şablon'),
    type: 'product',
    orientation: raw?.orientation === 'vertical' ? 'vertical' : 'horizontal',
    width: Number(raw?.width) || 70,
    height: Number(raw?.height) || 46,
    marginLeft: Number.isFinite(Number(raw?.marginLeft)) ? Number(raw.marginLeft) : 5,
    marginRight: Number.isFinite(Number(raw?.marginRight)) ? Number(raw.marginRight) : 5,
    labelsPerRow: Number.isFinite(Number(raw?.labelsPerRow)) ? Number(raw.labelsPerRow) : 1,
    gapX: Number.isFinite(Number(raw?.gapX)) ? Number(raw.gapX) : 2,
    gapY: Number.isFinite(Number(raw?.gapY)) ? Number(raw.gapY) : 7,
    fields,
    positions,
  }
}

/** Önizleme ve PDF ile aynı: dikey modda genişlik/yükseklik takası. */
export function getLabelPrintDimensions(tpl: Pick<LabelTemplate, 'orientation' | 'width' | 'height'>) {
  if (tpl.orientation === 'vertical') {
    return { widthMm: tpl.height, heightMm: tpl.width }
  }
  return { widthMm: tpl.width, heightMm: tpl.height }
}

/** JsBarcode formatı — EAN13 geçersizse CODE128 kullanılır. */
export function getJsBarcodeFormat(value: string): 'EAN13' | 'EAN8' | 'CODE128' {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 13) return 'EAN13'
  if (digits.length === 8) return 'EAN8'
  return 'CODE128'
}

/** CSS top ile jsPDF baseline hizası (mm, yaklaşık). */
export function topPercentToTextBaselineMm(yPercent: number, pageHeightMm: number, fontSizePt: number): number {
  const yTopMm = (yPercent / 100) * pageHeightMm
  const ptToMm = 25.4 / 72
  return yTopMm + fontSizePt * ptToMm * 0.76
}
