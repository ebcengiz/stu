import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Package,
  TrendingDown,
  Warehouse,
  ArrowLeftRight,
  Boxes,
} from 'lucide-react'
import { getDashboardPageData } from '@/lib/services/dashboard'
import { calculateTotalStock } from '@/lib/domain/stock'
import {
  getMovementTypeLabel,
  getMovementTypeBadgeClass,
} from '@/lib/domain/stock-movements'
import type { DashboardStatCard } from '@/lib/services/dashboard'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts'),
  { loading: () => <div className="h-64 rounded-lg bg-gray-100 animate-pulse" /> }
)

const STAT_ICONS = {
  Package,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  TrendingDown,
} as const

function StatCardLink({ stat }: { stat: DashboardStatCard }) {
  const Icon = STAT_ICONS[stat.iconName]
  return (
    <Link
      href={stat.href}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="p-4 xl:p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${stat.color} rounded-md p-2 xl:p-3`}>
            <Icon className="h-5 w-5 xl:h-6 xl:w-6 text-white" />
          </div>
          <div className="ml-3 xl:ml-5 w-0 flex-1">
            <dl>
              <dt className="text-xs xl:text-sm font-medium text-gray-500 truncate">
                {stat.name}
              </dt>
              <dd className="text-xl xl:text-3xl font-semibold text-gray-900">
                {stat.value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardPageData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Stok durumunuzu ve istatistiklerinizi takip edin</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-6">
        {data.statsCards.map((stat) => (
          <StatCardLink key={stat.name} stat={stat} />
        ))}
      </div>

      <DashboardCharts topProducts={data.topProducts} warehouseStats={data.warehouseStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg h-full">
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
            {data.recentMovements.length > 0 ? (
              <div className="space-y-4">
                {data.recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getMovementTypeBadgeClass(
                            movement.movement_type
                          )}`}
                        >
                          {getMovementTypeLabel(movement.movement_type)}
                        </span>
                        <span className="font-medium text-gray-900">
                          {movement.products?.name || 'Bilinmeyen Ürün'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {movement.warehouses?.name || 'Bilinmeyen Depo'} • {movement.quantity}{' '}
                        {movement.unit || 'adet'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz aktivite bulunmamaktadır</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg h-full">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Düşük Stok Uyarıları</h2>
            <Link
              href="/dashboard/urunler?filter=low-stock"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Tümünü Gör
            </Link>
          </div>
          <div className="p-6">
            {data.lowStockProducts.length > 0 ? (
              <div className="space-y-4">
                {data.lowStockProducts.slice(0, 5).map((product) => {
                  const totalStock = calculateTotalStock(product.stock)
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="mt-1 text-sm text-gray-500">
                          Mevcut: {totalStock.toFixed(2)} {product.unit} • Minimum:{' '}
                          {product.min_stock_level} {product.unit}
                        </div>
                        {product.stock && product.stock.length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            {product.stock.map((s, i) => (
                              <span key={i}>
                                {s.warehouses?.name}: {Number(s.quantity || 0).toFixed(2)}
                                {i < (product.stock?.length ?? 0) - 1 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            totalStock <= product.min_stock_level / 2
                              ? 'bg-red-600 text-white'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {totalStock <= product.min_stock_level / 2 ? 'Kritik' : 'Düşük'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Düşük stok uyarısı bulunmamaktadır</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
