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
  }
  positions: Record<string, LabelFieldPosition>
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
