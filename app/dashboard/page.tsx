import { createClient } from '@/lib/supabase/server'
import { Package, TrendingDown, Warehouse, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'

// Helper function to calculate total stock correctly (handles duplicates)
function calculateTotalStock(stockRecords?: Array<{ warehouse_id?: string; quantity: number }>) {
  if (!stockRecords || stockRecords.length === 0) return 0

  // Group by warehouse_id and keep only one record per warehouse (sum duplicates)
  const uniqueStockByWarehouse = new Map<string, number>()

  stockRecords.forEach(record => {
    const warehouseId = record.warehouse_id || 'default'
    const currentQty = uniqueStockByWarehouse.get(warehouseId) || 0

    // For duplicates in same warehouse, only count once (take max or first one)
    if (currentQty === 0) {
      uniqueStockByWarehouse.set(warehouseId, Number(record.quantity || 0))
    }
  })

  // Sum up the quantities from unique warehouses
  return Array.from(uniqueStockByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get counts using count query
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  const { count: warehousesCount } = await supabase
    .from('warehouses')
    .select('*', { count: 'exact', head: true })

  const { count: movementsCount } = await supabase
    .from('stock_movements')
    .select('*', { count: 'exact', head: true })

  // Get products with stock info to calculate low stock
  const { data: productsWithStock } = await supabase
    .from('products')
    .select(`
      *,
      stock (
        quantity,
        warehouse_id,
        warehouses (name)
      )
    `)
    .eq('is_active', true)

  // Calculate low stock products
  const lowStockProducts = productsWithStock?.filter(product => {
    const totalStock = calculateTotalStock(product.stock)
    return totalStock <= product.min_stock_level
  }) || []

  // Get recent stock movements
  const { data: recentMovements } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products (name),
      warehouses (name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      name: 'Toplam Ürün',
      value: productsCount || 0,
      icon: Package,
      color: 'bg-blue-500',
      href: '/dashboard/urunler'
    },
    {
      name: 'Depolar',
      value: warehousesCount || 0,
      icon: Warehouse,
      color: 'bg-green-500',
      href: '/dashboard/depolar'
    },
    {
      name: 'Hareketler',
      value: movementsCount || 0,
      icon: ArrowLeftRight,
      color: 'bg-purple-500',
      href: '/dashboard/stok-hareketleri'
    },
    {
      name: 'Düşük Stok',
      value: lowStockProducts.length,
      icon: TrendingDown,
      color: 'bg-red-500',
      href: '/dashboard/urunler'
    },
  ]

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'in': 'Giriş',
      'out': 'Çıkış',
      'transfer': 'Transfer',
      'adjustment': 'Düzeltme'
    }
    return types[type] || type
  }

  const getMovementTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      'in': 'bg-green-100 text-green-800',
      'out': 'bg-red-100 text-red-800',
      'transfer': 'bg-blue-100 text-blue-800',
      'adjustment': 'bg-yellow-100 text-yellow-800'
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Stok durumunuzu buradan takip edebilirsiniz</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h2>
          <Link
            href="/dashboard/stok-hareketleri"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Tümünü Gör
          </Link>
        </div>
        <div className="p-6">
          {recentMovements && recentMovements.length > 0 ? (
            <div className="space-y-4">
              {recentMovements.map((movement: any) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMovementTypeBadge(movement.movement_type)}`}>
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {movement.products?.name || 'Bilinmeyen Ürün'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {movement.warehouses?.name || 'Bilinmeyen Depo'} • {movement.quantity} {movement.unit || 'adet'}
                    </div>
                    {movement.notes && (
                      <div className="mt-1 text-xs text-gray-400">
                        {movement.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Henüz aktivite bulunmamaktadır
            </p>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Düşük Stok Uyarıları</h2>
          <Link
            href="/dashboard/urunler"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Tümünü Gör
          </Link>
        </div>
        <div className="p-6">
          {lowStockProducts.length > 0 ? (
            <div className="space-y-4">
              {lowStockProducts.slice(0, 5).map((product: any) => {
                const totalStock = calculateTotalStock(product.stock)
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        Mevcut: {totalStock.toFixed(2)} {product.unit} • Minimum: {product.min_stock_level} {product.unit}
                      </div>
                      {product.stock && product.stock.length > 0 && (
                        <div className="mt-1 text-xs text-gray-400">
                          {product.stock.map((s: any, i: number) => (
                            <span key={i}>
                              {s.warehouses?.name}: {Number(s.quantity || 0).toFixed(2)}
                              {i < product.stock.length - 1 ? ' • ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {totalStock <= product.min_stock_level / 2 ? 'Kritik' : 'Düşük'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Düşük stok uyarısı bulunmamaktadır
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
