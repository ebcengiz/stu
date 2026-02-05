'use client'

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { CURRENCY_SYMBOLS, type ExchangeRates } from '@/lib/currency'
import { useState } from 'react'
import { PieChart, BarChart3, TrendingUp, Archive } from 'lucide-react'

interface DashboardChartsProps {
  topProducts: {
    name: string
    stock: number
    unit: string
    price: number
    currency: string
  }[]
  warehouseStats: {
    name: string
    totalQty: number
    totalValueTRY: number
  }[]
  exchangeRates: ExchangeRates
}

export default function DashboardCharts({ topProducts, warehouseStats, exchangeRates }: DashboardChartsProps) {
  const [pieMetric, setPieMetric] = useState<'qty' | 'value'>('value')

  // Calculate percentages for Bar Chart
  const maxStock = Math.max(...topProducts.map(p => p.stock), 1)

  // Calculate percentages for Pie Chart
  const totalMetric = warehouseStats.reduce((sum, w) => sum + (pieMetric === 'value' ? w.totalValueTRY : w.totalQty), 0) || 1
  
  // Prepare pie slices (using conic-gradient logic)
  let currentAngle = 0
  const pieSlices = warehouseStats.map((w, index) => {
    const value = pieMetric === 'value' ? w.totalValueTRY : w.totalQty
    const percentage = (value / totalMetric) * 100
    const angle = (value / totalMetric) * 360
    
    // Colors for slices
    const colors = [
      '#3b82f6', // blue-500
      '#10b981', // green-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
    ]
    const color = colors[index % colors.length]
    
    const slice = {
      name: w.name,
      value,
      percentage,
      color,
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    }
    
    currentAngle += angle
    return slice
  })

  // Create conic-gradient string
  const gradientString = pieSlices
    .map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`)
    .join(', ')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Bar Chart: Top Stock Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <CardTitle>En Yüksek Stoklu Ürünler</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 truncate max-w-[200px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-gray-500">
                    {product.stock.toLocaleString('tr-TR')} {product.unit}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(product.stock / maxStock) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-gray-400 py-4">Gösterilecek veri yok</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Pie Chart: Warehouse Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-gray-500" />
              <CardTitle>Depo Dağılımı</CardTitle>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPieMetric('value')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pieMetric === 'value' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Değer (₺)
              </button>
              <button
                onClick={() => setPieMetric('qty')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pieMetric === 'qty' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Miktar
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {warehouseStats.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* CSS Pie Chart */}
              <div 
                className="relative w-48 h-48 rounded-full flex-shrink-0 shadow-inner"
                style={{ background: `conic-gradient(${gradientString})` }}
              >
                {/* Inner white circle for donut effect */}
                <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <span className="block text-xs text-gray-400 font-medium uppercase tracking-wider">TOPLAM</span>
                    <span className="block text-sm font-bold text-gray-900">
                      {pieMetric === 'value' 
                        ? `₺${totalMetric.toLocaleString('tr-TR', { maximumFractionDigits: 0, notation: "compact" })}`
                        : totalMetric.toLocaleString('tr-TR', { maximumFractionDigits: 0, notation: "compact" })
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-3">
                {pieSlices.map((slice, index) => (
                  <div key={index} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-gray-600 truncate max-w-[120px]">{slice.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {pieMetric === 'value' 
                          ? `₺${slice.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
                          : slice.value.toLocaleString('tr-TR')
                        }
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-right">{slice.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <p className="text-center text-gray-400 py-8">Gösterilecek veri yok</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
