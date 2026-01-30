'use client'

import { useState, useEffect } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'

interface Product {
  id: string
  name: string
  unit: string
}

interface Warehouse {
  id: string
  name: string
}

interface Movement {
  id: string
  movement_type: string
  quantity: number
  reference_no: string | null
  notes: string | null
  created_at: string
  products?: { name: string; unit: string }
  warehouses?: { name: string }
  profiles?: { full_name: string }
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    movement_type: 'in',
    quantity: 0,
    reference_no: '',
    notes: ''
  })

  useEffect(() => {
    fetchMovements()
    fetchProducts()
    fetchWarehouses()
  }, [])

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/stock-movements')
      const data = await response.json()
      setMovements(data)
    } catch (error) {
      console.error('Error fetching movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data.filter((p: any) => p.is_active))
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(data.filter((w: any) => w.is_active))
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // Prevent double submit
    setLoading(true)

    try {
      // Clean data: convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        reference_no: formData.reference_no.trim() || null,
        notes: formData.notes.trim() || null,
      }

      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) throw new Error('Failed to create movement')

      setShowModal(false)
      setFormData({
        product_id: '',
        warehouse_id: '',
        movement_type: 'in',
        quantity: 0,
        reference_no: '',
        notes: ''
      })
      fetchMovements()
      alert('Stok hareketi başarıyla kaydedildi')
    } catch (error) {
      console.error('Error creating movement:', error)
      alert('Stok hareketi kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const openNewModal = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      movement_type: 'in',
      quantity: 0,
      reference_no: '',
      notes: ''
    })
    setShowModal(true)
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />
      case 'out':
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />
      case 'transfer':
        return <ArrowRightLeft className="h-5 w-5 text-blue-600" />
      case 'adjustment':
        return <Settings className="h-5 w-5 text-orange-600" />
      default:
        return null
    }
  }

  const getMovementTypeText = (type: string) => {
    switch (type) {
      case 'in':
        return 'Giriş'
      case 'out':
        return 'Çıkış'
      case 'transfer':
        return 'Transfer'
      case 'adjustment':
        return 'Düzeltme'
      default:
        return type
    }
  }

  if (loading && movements.length === 0) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stok Hareketleri</h1>
          <p className="mt-2 text-gray-600">Tüm stok giriş ve çıkışlarını görüntüleyin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Hareket
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hareket Geçmişi</CardTitle>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notlar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.length > 0 ? (
                  movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(movement.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <span className="text-sm font-medium text-gray-900">
                            {getMovementTypeText(movement.movement_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.products?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.warehouses?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {movement.quantity} {movement.products?.unit || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.reference_no || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {movement.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Henüz stok hareketi bulunmuyor. Yeni hareket eklemek için yukarıdaki butonu kullanın.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">Yeni Stok Hareketi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hareket Tipi *
                  </label>
                  <select
                    required
                    value={formData.movement_type}
                    onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="in">Giriş</option>
                    <option value="out">Çıkış</option>
                    <option value="adjustment">Düzeltme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ürün *
                  </label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Ürün Seçin</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Depo *
                  </label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Depo Seçin</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00') {
                        e.target.select() // Select all so typing replaces it
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referans No
                </label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Fatura no, irsaliye no vb."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ek bilgiler..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
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
