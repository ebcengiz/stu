import { createClient } from '@/lib/supabase/server'
import { getExchangeRates, type ExchangeRates } from '@/lib/currency'
import { calculateTotalStock } from '@/lib/domain/stock'

export type DashboardTopProduct = {
  id: string
  name: string
  stock: number
  unit: string
  price: number
  currency: string
}

export type DashboardWarehouseStat = {
  name: string
  totalQty: number
  totalValueTRY: number
}

export type DashboardRecentMovement = {
  id: string
  movement_type: string
  quantity: number
  unit: string | null
  created_at: string
  products?: { name: string } | null
  warehouses?: { name: string } | null
}

export type DashboardPageData = {
  productsCount: number
  warehousesCount: number
  movementsCount: number
  topProducts: DashboardTopProduct[]
  warehouseStats: DashboardWarehouseStat[]
  lowStockProducts: ProductWithStock[]
  recentMovements: DashboardRecentMovement[]
  statsCards: DashboardStatCard[]
}

export type DashboardStatCard = {
  name: string
  value: string | number
  color: string
  href: string
  iconName: 'Package' | 'Boxes' | 'Warehouse' | 'ArrowLeftRight' | 'TrendingDown'
}

type ProductWithStock = {
  id: string
  name: string
  unit: string
  min_stock_level: number
  price: number | null
  currency: string | null
  stock?: Array<{
    quantity: number | string
    warehouse_id?: string | null
    warehouses?: { name: string } | null
  }>
}

function buildWarehouseStats(
  products: ProductWithStock[] | null,
  exchangeRates: ExchangeRates
): DashboardWarehouseStat[] {
  const warehouseStatsMap = new Map<string, { name: string; totalQty: number; totalValueTRY: number }>()

  for (const product of products ?? []) {
    for (const s of product.stock ?? []) {
      if (!s.warehouses) continue

      const warehouseName = s.warehouses.name
      const qty = Number(s.quantity)
      const price = product.price || 0
      const currency = product.currency || 'TRY'
      const rate = exchangeRates[currency] || 1
      const valueInTRY = (price / rate) * qty

      if (!warehouseStatsMap.has(warehouseName)) {
        warehouseStatsMap.set(warehouseName, { name: warehouseName, totalQty: 0, totalValueTRY: 0 })
      }
      const stats = warehouseStatsMap.get(warehouseName)!
      stats.totalQty += qty
      stats.totalValueTRY += valueInTRY
    }
  }

  return Array.from(warehouseStatsMap.values())
}

export async function getDashboardPageData(): Promise<DashboardPageData> {
  const supabase = await createClient()

  const [
    { count: productsCount },
    { count: warehousesCount },
    { count: movementsCount },
    exchangeRates,
    { data: products },
    { data: recentMovementsRaw },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('warehouses').select('*', { count: 'exact', head: true }),
    supabase.from('stock_movements').select('*', { count: 'exact', head: true }),
    getExchangeRates(),
    supabase
      .from('products')
      .select('*, stock (quantity, warehouse_id, warehouses (name))')
      .eq('is_active', true),
    supabase
      .from('stock_movements')
      .select('*, products (name), warehouses (name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const productRows = (products ?? []) as ProductWithStock[]

  const topProducts: DashboardTopProduct[] = productRows
    .map((p) => {
      const totalStock = calculateTotalStock(p.stock)
      return {
        id: p.id,
        name: p.name,
        stock: totalStock,
        unit: p.unit,
        price: p.price ?? 0,
        currency: p.currency ?? 'TRY',
      }
    })
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)

  const warehouseStats = buildWarehouseStats(productRows, exchangeRates)

  const exactTotalStock = productRows.reduce((sum, p) => sum + calculateTotalStock(p.stock), 0)

  const lowStockProducts = productRows.filter((product) => {
    const totalStock = calculateTotalStock(product.stock)
    return totalStock <= product.min_stock_level
  })

  const recentMovements = (recentMovementsRaw ?? []) as DashboardRecentMovement[]

  const statsCards: DashboardStatCard[] = [
    {
      name: 'Toplam Ürün Çeşidi',
      value: productsCount ?? 0,
      color: 'bg-blue-500',
      href: '/dashboard/urunler',
      iconName: 'Package',
    },
    {
      name: 'Toplam Stok Adedi',
      value: exactTotalStock.toLocaleString('tr-TR'),
      color: 'bg-indigo-500',
      href: '/dashboard/urunler',
      iconName: 'Boxes',
    },
    {
      name: 'Depolar',
      value: warehousesCount ?? 0,
      color: 'bg-green-500',
      href: '/dashboard/depolar',
      iconName: 'Warehouse',
    },
    {
      name: 'Hareketler',
      value: movementsCount ?? 0,
      color: 'bg-purple-500',
      href: '/dashboard/stok-hareketleri',
      iconName: 'ArrowLeftRight',
    },
    {
      name: 'Düşük Stok',
      value: lowStockProducts.length,
      color: 'bg-red-500',
      href: '/dashboard/urunler',
      iconName: 'TrendingDown',
    },
  ]

  return {
    productsCount: productsCount ?? 0,
    warehousesCount: warehousesCount ?? 0,
    movementsCount: movementsCount ?? 0,
    topProducts,
    warehouseStats,
    lowStockProducts,
    recentMovements,
    statsCards,
  }
}

