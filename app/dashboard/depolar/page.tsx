'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Warehouse, MapPin } from 'lucide-react'
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

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [formData, setFormData] = useState({ name: '', location: '', is_active: true })

  useEffect(() => {
    fetchWarehouses()
  }, [])

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

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    setFormData({
      name: warehouse.name,
      location: warehouse.location || '',
      is_active: warehouse.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
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

  if (loading && warehouses.length === 0) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Depolar</h1>
          <p className="mt-2 text-gray-600">Depolarınızı yönetin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Depo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardBody>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-100 rounded-lg flex-shrink-0">
                  <Warehouse className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">{warehouse.name}</h3>
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
                      <a
                        href={(() => {
                          const match = warehouse.location?.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/)
                          if (match) {
                            return `https://www.openstreetmap.org/?mlat=${match[1]}&mlon=${match[2]}&zoom=15`
                          }
                          return '#'
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary-600 hover:underline line-clamp-2 flex-1"
                        title={warehouse.location}
                      >
                        {warehouse.location.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*$/, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(warehouse)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(warehouse.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
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

      {/* Modal */}
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
