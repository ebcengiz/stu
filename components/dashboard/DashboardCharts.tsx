'use client'

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useState } from 'react'
import { PieChart, BarChart3 } from 'lucide-react'

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
}

export default function DashboardCharts({ topProducts, warehouseStats }: DashboardChartsProps) {
  const [pieMetric, setPieMetric] = useState<'qty' | 'value'>('value')

  // Calculate percentages for Bar Chart
  const maxStock = Math.max(...topProducts.map(p => p.stock), 1)

  // Calculate percentages for Pie Chart
  const totalMetric = warehouseStats.reduce((sum, w) => sum + (pieMetric === 'value' ? w.totalValueTRY : w.totalQty), 0) || 1
  
  const colors = [
    '#818cf8',
    '#34d399',
    '#fbbf24',
    '#f87171',
    '#a78bfa',
    '#f472b6',
    '#22d3ee',
  ] as const

  const pieSlices = warehouseStats.reduce<
    {
      name: string
      value: number
      percentage: number
      color: string
      startAngle: number
      endAngle: number
    }[]
  >((acc, w, index) => {
    const value = pieMetric === 'value' ? w.totalValueTRY : w.totalQty
    const percentage = (value / totalMetric) * 100
    const angle = (value / totalMetric) * 360
    const color = colors[index % colors.length]
    const startAngle = acc.length === 0 ? 0 : acc[acc.length - 1].endAngle
    const endAngle = startAngle + angle
    acc.push({
      name: w.name,
      value,
      percentage,
      color,
      startAngle,
      endAngle,
    })
    return acc
  }, [])

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
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <CardTitle>En Yüksek Stoklu Ürünler</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600 truncate max-w-[200px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-gray-400">
                    {product.stock.toLocaleString('tr-TR')} {product.unit}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-100/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
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
              <PieChart className="h-5 w-5 text-gray-400" />
              <CardTitle>Depo Dağılımı</CardTitle>
            </div>
            <div className="flex bg-gray-100/60 rounded-lg p-1">
              <button
                onClick={() => setPieMetric('value')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pieMetric === 'value' ? 'bg-slate-600 shadow text-gray-800' : 'text-gray-500 hover:text-gray-600'
                }`}
              >
                Değer (₺)
              </button>
              <button
                onClick={() => setPieMetric('qty')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pieMetric === 'qty' ? 'bg-slate-600 shadow text-gray-800' : 'text-gray-500 hover:text-gray-600'
                }`}
              >
                Miktar
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {warehouseStats.length > 0 ? (
            <div className="flex flex-col xl:flex-row items-center gap-6 xl:gap-8">
              {/* CSS Pie Chart */}
              <div 
                className="relative w-40 h-40 xl:w-48 xl:h-48 rounded-full flex-shrink-0 shadow-inner"
                style={{ background: `conic-gradient(${gradientString})` }}
              >
                {/* Inner dark circle for donut effect */}
                <div className="absolute inset-6 xl:inset-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                  <div className="text-center">
                    <span className="block text-[10px] xl:text-xs text-gray-400 font-medium uppercase tracking-wider">TOPLAM</span>
                    <span className="block text-xs xl:text-sm font-bold text-gray-700">
                      {pieMetric === 'value' 
                        ? `₺${totalMetric.toLocaleString('tr-TR', { maximumFractionDigits: 0, notation: "compact" })}`
                        : totalMetric.toLocaleString('tr-TR', { maximumFractionDigits: 0, notation: "compact" })
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2 xl:space-y-3">
                {pieSlices.map((slice, index) => (
                  <div key={index} className="flex items-center justify-between text-xs xl:text-sm group">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 xl:w-3 xl:h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-gray-500 truncate max-w-[100px] xl:max-w-[120px]">{slice.name}</span>
                    </div>
                    <div className="flex items-center gap-2 xl:gap-3">
                      <span className="font-semibold text-gray-700">
                        {pieMetric === 'value' 
                          ? `₺${slice.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
                          : slice.value.toLocaleString('tr-TR')
                        }
                      </span>
                      <span className="text-[10px] xl:text-xs text-gray-400 w-8 text-right">{slice.percentage.toFixed(1)}%</span>
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
