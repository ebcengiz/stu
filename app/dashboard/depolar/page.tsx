'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Warehouse, MapPin, X, Package, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import dynamic from 'next/dynamic'

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/warehouse/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded flex items-center justify-center">Harita yükleniyor...</div>
})

interface Warehouse {
  id: string
  name: string
  location: string | null
  is_active: boolean
  created_at: string
}

interface ProductStock {
  id: string
  name: string
  sku: string | null
  price: number | null
  unit: string
  quantity: number
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [formData, setFormData] = useState({ name: '', location: '', is_active: true })
  
  // Warehouse Detail State
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [warehouseStock, setWarehouseStock] = useState<ProductStock[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [stockSearchTerm, setStockSearchTerm] = useState('')

  useEffect(() => {
    fetchWarehouses()
  }, [])

  // Fetch stock when a warehouse is selected
  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseStock(selectedWarehouse.id)
    }
  }, [selectedWarehouse])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouseStock = async (warehouseId: string) => {
    setLoadingStock(true)
    try {
      // Fetch all products with their stock info
      // In a real app with many products, this should be a dedicated API endpoint with filtering
      const response = await fetch('/api/products')
      const products = await response.json()

      // Filter and map to get only stock for this warehouse
      const stockItems: ProductStock[] = products
        .map((product: any) => {
          // Find stock record for this warehouse
          const stockRecord = product.stock?.find((s: any) => s.warehouse_id === warehouseId)
          const quantity = Number(stockRecord?.quantity || 0)

          if (quantity > 0) {
            return {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              unit: product.unit,
              quantity: quantity
            }
          }
          return null
        })
        .filter((item: any) => item !== null)

      setWarehouseStock(stockItems)
    } catch (error) {
      console.error('Error fetching warehouse stock:', error)
    } finally {
      setLoadingStock(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // Prevent double submit
    setLoading(true)

    try {
      const url = editingWarehouse
        ? `/api/warehouses/${editingWarehouse.id}`
        : '/api/warehouses'

      const method = editingWarehouse ? 'PUT' : 'POST'

      // Clean data: convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        location: formData.location.trim() || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) throw new Error('Failed to save warehouse')

      setShowModal(false)
      setEditingWarehouse(null)
      setFormData({ name: '', location: '', is_active: true })
      fetchWarehouses()
    } catch (error) {
      console.error('Error saving warehouse:', error)
      alert('Depo kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (e: React.MouseEvent, warehouse: Warehouse) => {
    e.stopPropagation() // Prevent card click
    setEditingWarehouse(warehouse)
    setFormData({
      name: warehouse.name,
      location: warehouse.location || '',
      is_active: warehouse.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent card click
    if (!confirm('Bu depoyu silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/warehouses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete warehouse')

      fetchWarehouses()
    } catch (error) {
      console.error('Error deleting warehouse:', error)
      alert('Depo silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingWarehouse(null)
    setFormData({ name: '', location: '', is_active: true })
    setShowModal(true)
  }

  const filteredStock = warehouseStock.filter(item => 
    item.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(stockSearchTerm.toLowerCase())
  )

  const totalWarehouseValue = filteredStock.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)

  if (loading && warehouses.length === 0) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Depolar</h1>
          <p className="mt-2 text-gray-600">Depolarınızı yönetin ve stok durumlarını inceleyin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Depo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div 
            key={warehouse.id}
            onClick={() => setSelectedWarehouse(warehouse)}
            className="cursor-pointer group"
          >
            <Card className="h-full transition-shadow hover:shadow-md border-transparent hover:border-primary-200">
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-lg flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                    <Warehouse className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-700">{warehouse.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${
                        warehouse.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {warehouse.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    {warehouse.location && (
                      <div className="flex items-start gap-1 mb-3 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span 
                          className="line-clamp-2 flex-1"
                          onClick={(e) => {
                             e.stopPropagation()
                             // Open map logic here if needed, or link
                             const match = warehouse.location?.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/)
                             if (match) {
                               window.open(`https://www.openstreetmap.org/?mlat=${match[1]}&mlon=${match[2]}&zoom=15`, '_blank')
                             }
                          }}
                        >
                          {warehouse.location.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*$/, '')}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => handleEdit(e, warehouse)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, warehouse.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="ml-auto text-xs text-gray-400 self-center">
                        Detaylar için tıklayın →
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        ))}

        {warehouses.length === 0 && (
          <Card className="col-span-3">
            <CardBody>
              <p className="text-center text-gray-500 py-8">
                Henüz depo eklenmemiş. Yeni depo eklemek için yukarıdaki butonu kullanın.
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Warehouse Detail Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <Warehouse className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedWarehouse.name}</h2>
                  <p className="text-sm text-gray-500">Depo Stok Detayları</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedWarehouse(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Depoda ürün ara..."
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                  <span className="text-sm text-green-700 font-medium">Toplam Depo Değeri:</span>
                  <span className="ml-2 text-lg font-bold text-green-800">
                    ₺{totalWarehouseValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {loadingStock ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredStock.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Değer</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStock.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {item.quantity.toLocaleString('tr-TR')} {item.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {item.price ? `₺${item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                            ₺{((item.price || 0) * item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {stockSearchTerm ? 'Aranan kriterlere uygun ürün bulunamadı.' : 'Bu depoda henüz ürün bulunmuyor.'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
              <Button onClick={() => setSelectedWarehouse(null)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 50 }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            style={{ zIndex: 51 }}
          >
            <h2 className="text-xl font-bold mb-4">
              {editingWarehouse ? 'Depo Düzenle' : 'Yeni Depo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Depo Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasyon
                </label>
                <LocationPicker
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Depo Aktif
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}