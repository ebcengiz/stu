import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().uuid('Geçerli bir kategori seçiniz').optional(),
  unit: z.enum(['adet', 'kg', 'litre', 'metre', 'paket']),
  min_stock_level: z.number().min(0, 'Minimum stok seviyesi 0 veya daha büyük olmalıdır'),
})

export type ProductInput = z.infer<typeof productSchema>
