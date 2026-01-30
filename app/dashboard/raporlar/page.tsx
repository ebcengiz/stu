'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { FileText, Package, TrendingDown, Calendar } from 'lucide-react'

interface Product {
  id: string
  name: string
  unit: string
  min_stock_level: number
  categories?: { name: string }
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id?: string
    last_updated: string
    warehouses?: { name: string }
  }>
}

interface Movement {
  id: string
  movement_type: string
  quantity: number
  created_at: string
  products?: { name: string }
  warehouses?: { name: string }
}

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<string>('stock')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/stock-movements')
      ])

      const productsData = await productsRes.json()
      const movementsData = await movementsRes.json()

      setProducts(productsData)
      setMovements(movementsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLowStockProducts = () => {
    return products.filter(product => {
      // ROBUST FIX: Two-level deduplication
      // Step 1: Deduplicate by record ID
      const uniqueById = new Map()
      product.stock?.forEach(s => {
        if (!uniqueById.has(s.id) || uniqueById.get(s.id).last_updated < s.last_updated) {
          uniqueById.set(s.id, s)
        }
      })
      // Step 2: Group by warehouse
      const byWarehouse = new Map<string, number>()
      Array.from(uniqueById.values()).forEach(s => {
        if (s.warehouse_id) {
          byWarehouse.set(s.warehouse_id, Number(s.quantity || 0))
        }
      })
      const totalStock = Array.from(byWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
      return totalStock < product.min_stock_level
    })
  }

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'in': 'Giriş',
      'out': 'Çıkış',
      'transfer': 'Transfer',
      'adjustment': 'Düzeltme'
    }
    return types[type] || type
  }

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  const lowStockProducts = getLowStockProducts()
  const totalProducts = products.length
  const totalMovements = movements.length

  const reports = [
    {
      id: 'stock',
      name: 'Stok Durum Raporu',
      description: `${totalProducts} ürün için güncel stok durumu`,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      id: 'movements',
      name: 'Hareket Raporu',
      description: `Son ${Math.min(totalMovements, 50)} stok hareketi`,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      id: 'lowstock',
      name: 'Düşük Stok Raporu',
      description: `${lowStockProducts.length} ürün kritik seviyede`,
      icon: TrendingDown,
      color: 'bg-red-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
        <p className="mt-2 text-gray-600">Stok raporlarını görüntüleyin</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`text-left transition-all ${
                activeReport === report.id
                  ? 'ring-2 ring-primary-500'
                  : 'hover:shadow-md'
              }`}
            >
              <Card>
                <CardBody>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 ${report.color} rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Stock Status Report */}
      {activeReport === 'stock' && (
        <Card>
          <CardHeader>
            <CardTitle>Stok Durum Raporu</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min. Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Depo Dağılımı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    // ROBUST FIX: Two-level deduplication
                    // Step 1: Deduplicate by record ID
                    const uniqueById = new Map()
                    product.stock?.forEach(s => {
                      if (!uniqueById.has(s.id) || uniqueById.get(s.id).last_updated < s.last_updated) {
                        uniqueById.set(s.id, s)
                      }
                    })
                    // Step 2: Group by warehouse
                    const byWarehouse = new Map<string, number>()
                    Array.from(uniqueById.values()).forEach(s => {
                      if (s.warehouse_id) {
                        byWarehouse.set(s.warehouse_id, Number(s.quantity || 0))
                      }
                    })
                    const totalStock = Array.from(byWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
                    const isLow = totalStock < product.min_stock_level
                    const isCritical = totalStock < product.min_stock_level / 2

                    return (
                      <tr key={product.id} className={isLow ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.categories?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {totalStock.toFixed(2)} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.min_stock_level} {product.unit}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {product.stock && product.stock.length > 0 ? (
                            <div className="space-y-1">
                              {product.stock.map((s, i) => (
                                <div key={i}>
                                  {s.warehouses?.name}: {Number(s.quantity || 0).toFixed(2)} {product.unit}
                                </div>
                              ))}
                            </div>
                          ) : (
                            'Stok yok'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isCritical
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isCritical ? 'Kritik' : isLow ? 'Düşük' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Henüz ürün bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Movements Report */}
      {activeReport === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle>Hareket Raporu (Son 50)</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Depo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Miktar
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.slice(0, 50).map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          movement.movement_type === 'in'
                            ? 'bg-green-100 text-green-800'
                            : movement.movement_type === 'out'
                            ? 'bg-red-100 text-red-800'
                            : movement.movement_type === 'transfer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getMovementTypeLabel(movement.movement_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.products?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.warehouses?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {movement.quantity}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Henüz hareket bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Low Stock Report */}
      {activeReport === 'lowstock' && (
        <Card>
          <CardHeader>
            <CardTitle>Düşük Stok Raporu</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mevcut Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min. Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eksik
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockProducts.map((product) => {
                    // ROBUST FIX: Two-level deduplication
                    // Step 1: Deduplicate by record ID
                    const uniqueById = new Map()
                    product.stock?.forEach(s => {
                      if (!uniqueById.has(s.id) || uniqueById.get(s.id).last_updated < s.last_updated) {
                        uniqueById.set(s.id, s)
                      }
                    })
                    // Step 2: Group by warehouse
                    const byWarehouse = new Map<string, number>()
                    Array.from(uniqueById.values()).forEach(s => {
                      if (s.warehouse_id) {
                        byWarehouse.set(s.warehouse_id, Number(s.quantity || 0))
                      }
                    })
                    const totalStock = Array.from(byWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
                    const shortage = product.min_stock_level - totalStock
                    const isCritical = totalStock < product.min_stock_level / 2

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.categories?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {totalStock.toFixed(2)} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.min_stock_level} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          {shortage.toFixed(2)} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isCritical
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isCritical ? 'Kritik' : 'Düşük'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {lowStockProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Düşük stoklu ürün bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
