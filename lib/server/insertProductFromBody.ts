import type { SupabaseClient } from '@supabase/supabase-js'

const nullableStringKeys = ['sku', 'barcode', 'description', 'image_url', 'brand', 'gtip']

/**
 * Tekil ürün oluşturma — POST /api/products ile aynı temizleme ve stok hareketi mantığı.
 */
export async function insertProductFromBody(
  supabase: SupabaseClient,
  ctx: { tenantId: string; userId: string },
  body: Record<string, unknown>,
  opts?: { initialStockNote?: string }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { initial_quantity, warehouse_id, movement_type: _movement_type, ...productData } = body as {
    initial_quantity?: unknown
    warehouse_id?: unknown
    movement_type?: unknown
    [key: string]: unknown
  }

  const cleanData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(productData)) {
    if (key === 'case_inner_qty') continue
    if (key === 'shelf_location_id' && (value === '' || value === undefined)) {
      cleanData[key] = null
      continue
    }
    if (value === '' || value === undefined) {
      if (nullableStringKeys.includes(key)) {
        cleanData[key] = null
      }
    } else {
      cleanData[key] = value
    }
  }

  if ('case_inner_qty' in productData) {
    const ciq = (productData as { case_inner_qty?: unknown }).case_inner_qty
    cleanData.case_inner_qty =
      ciq === '' || ciq === null || ciq === undefined
        ? null
        : Math.max(1, Math.trunc(Number(ciq)))
  }

  if (Array.isArray(cleanData.sale_units)) {
    cleanData.sale_units = (cleanData.sale_units as string[]).filter(Boolean)
    if ((cleanData.sale_units as string[]).length === 0) {
      cleanData.sale_units = ['adet']
    }
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      ...cleanData,
      tenant_id: ctx.tenantId,
    })
    .select('id')
    .single()

  if (productError) {
    return { ok: false, message: productError.message }
  }

  const initQty = Number(initial_quantity)
  const wid = warehouse_id as string | undefined
  if (initQty > 0 && wid) {
    const { error: movementError } = await supabase.from('stock_movements').insert({
      tenant_id: ctx.tenantId,
      product_id: product.id,
      warehouse_id: wid,
      movement_type: 'in',
      quantity: initQty,
      reference_no: null,
      notes: opts?.initialStockNote ?? 'Başlangıç stoku',
      created_by: ctx.userId,
    })

    if (movementError) {
      return { ok: false, message: movementError.message }
    }
  }

  return { ok: true, id: product.id }
}
