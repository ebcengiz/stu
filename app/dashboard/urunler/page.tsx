'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter, useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
}

interface Warehouse {
  id: string
  name: string
  is_active: boolean
}

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  unit: string
  min_stock_level: number
  is_active: boolean
  category_id: string
  categories?: Category
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id?: string
    last_updated: string
    warehouses?: {
      name: string
    }
  }>
  created_at: string
}

// Helper function to calculate total stock correctly (handles duplicates)
function calculateTotalStock(stockRecords?: Array<{ warehouse_id?: string; quantity: number; last_updated: string }>) {
  if (!stockRecords || stockRecords.length === 0) return 0

  // Group by warehouse_id and keep only the most recent record for each warehouse
  const uniqueStockByWarehouse = new Map<string, number>()

  stockRecords.forEach(record => {
    const warehouseId = record.warehouse_id || 'default'
    const existingRecord = uniqueStockByWarehouse.get(warehouseId)

    // If no existing record or this record is more recent, use this one
    if (!existingRecord) {
      uniqueStockByWarehouse.set(warehouseId, Number(record.quantity || 0))
    }
  })

  // Sum up the quantities from unique warehouses
  return Array.from(uniqueStockByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low-stock'>('all')
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    unit: 'adet',
    min_stock_level: '' as string | number,
    category_id: '',
    is_active: true,
    // Yeni alanlar: Başlangıç stok bilgileri
    initial_quantity: '' as string | number,
    warehouse_id: '',
    movement_type: 'in' // Düzenlerken giriş mi çıkış mı
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchWarehouses()
  }, [])

  // URL parametresinden filtreyi oku
  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'low-stock') {
      setStockFilter('low-stock')
    }
  }, [searchParams])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()

      // DEBUG: Log stock data to see duplicates
      data.forEach((p: any) => {
        if (p.stock && p.stock.length > 1) {
          console.log(`Product "${p.name}" has ${p.stock.length} stock records:`, p.stock)
        }
      })

      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(data.filter((w: Warehouse) => w.is_active))
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submit
    if (loading) return

    setLoading(true)

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'

      const method = editingProduct ? 'PUT' : 'POST'

      // Clean data: convert empty strings to null for optional fields
      // Convert string numbers to actual numbers
      const cleanedData = {
        ...formData,
        sku: formData.sku.trim() || null,
        barcode: formData.barcode.trim() || null,
        description: formData.description.trim() || null,
        min_stock_level: typeof formData.min_stock_level === 'string'
          ? parseFloat(formData.min_stock_level) || 0
          : formData.min_stock_level,
        initial_quantity: typeof formData.initial_quantity === 'string'
          ? parseFloat(formData.initial_quantity) || 0
          : formData.initial_quantity,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save product')
      }

      setShowModal(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        unit: 'adet',
        min_stock_level: '',
        category_id: '',
        is_active: true,
        initial_quantity: '',
        warehouse_id: warehouses[0]?.id || '',
        movement_type: 'in'
      })

      // Başarılı mesajı göster
      alert(editingProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!')

      fetchProducts()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(error.message || 'Ürün kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    // Ürünün ilk stok kaydının deposunu seç, yoksa ilk aktif depoyu seç
    const defaultWarehouse = product.stock?.[0]?.warehouse_id || warehouses[0]?.id || ''

    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      unit: product.unit,
      min_stock_level: product.min_stock_level || '',
      category_id: product.category_id || '',
      is_active: product.is_active,
      // Düzenlerken de stok değişikliği yapılabilir
      initial_quantity: '',
      warehouse_id: defaultWarehouse,
      movement_type: 'in'
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete product')

      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Ürün silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      unit: 'adet',
      min_stock_level: '',
      category_id: '',
      is_active: true,
      initial_quantity: '',
      warehouse_id: warehouses[0]?.id || '', // İlk depoyu otomatik seç
      movement_type: 'in'
    })
    setShowModal(true)
  }

  const filteredProducts = products.filter(product => {
    // Arama filtresi
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())

    // Stok filtresi
    if (stockFilter === 'low-stock') {
      const totalStock = calculateTotalStock(product.stock)
      const isLowStock = totalStock <= product.min_stock_level
      return matchesSearch && isLowStock
    }

    return matchesSearch
  })

  if (loading && products.length === 0) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ürünler</h1>
          <p className="mt-2 text-gray-600">Ürünlerinizi yönetin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Ürün
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Ürün Listesi</CardTitle>
              {stockFilter === 'low-stock' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  <span>Düşük Stok Ürünleri</span>
                  <button
                    onClick={() => {
                      setStockFilter('all')
                      router.push('/dashboard/urunler')
                    }}
                    className="hover:bg-red-200 rounded-full p-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const totalStock = calculateTotalStock(product.stock)
                    const isLow = totalStock <= product.min_stock_level
                    const isCritical = totalStock <= product.min_stock_level / 2

                    return (
                      <tr key={product.id} className={`${isLow ? 'bg-red-50' : ''} hover:bg-gray-100`}>
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
                          {product.is_active ? (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isCritical
                                ? 'bg-red-100 text-red-800'
                                : isLow
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {isCritical ? 'Kritik' : isLow ? 'Düşük' : 'Normal'}
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Pasif
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {stockFilter === 'low-stock'
                        ? 'Düşük stokta ürün bulunmuyor.'
                        : searchTerm
                        ? 'Arama sonucu bulunamadı.'
                        : 'Henüz ürün eklenmemiş. Yeni ürün eklemek için yukarıdaki butonu kullanın.'
                      }
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ürün Adı *
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
                    Kategori *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barkod
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birim *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="adet">Adet</option>
                    <option value="kg">Kilogram</option>
                    <option value="litre">Litre</option>
                    <option value="metre">Metre</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Stok Seviyesi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.min_stock_level}
                    onChange={(e) => {
                      const isDecimalUnit = ['kg', 'litre', 'metre'].includes(formData.unit)
                      let value = e.target.value

                      if (isDecimalUnit) {
                        // Allow digits, dot and comma for decimal units
                        value = value.replace(/[^0-9.,]/g, '')
                        // Replace comma with dot
                        value = value.replace(/,/g, '.')
                        // Prevent multiple dots
                        const parts = value.split('.')
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('')
                        }
                        // Store as string to preserve typing state (e.g., "10." before "10.5")
                        setFormData({ ...formData, min_stock_level: value })
                      } else {
                        // Only allow digits for piece/package units
                        value = value.replace(/[^0-9]/g, '')
                        setFormData({ ...formData, min_stock_level: value })
                      }
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Stok Bilgileri - Hem yeni eklerken hem düzenlerken */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {editingProduct ? 'Stok Güncelle' : 'Başlangıç Stok Bilgileri'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingProduct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İşlem Tipi *
                      </label>
                      <select
                        value={formData.movement_type}
                        onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="in">Stok Girişi (+)</option>
                        <option value="out">Stok Çıkışı (-)</option>
                        <option value="adjustment">Düzeltme (=)</option>
                      </select>
                    </div>
                  )}
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
                      {editingProduct ? 'Miktar' : 'Başlangıç Stok Miktarı'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.initial_quantity}
                      onChange={(e) => {
                        const isDecimalUnit = ['kg', 'litre', 'metre'].includes(formData.unit)
                        let value = e.target.value

                        if (isDecimalUnit) {
                          // Allow digits, dot and comma for decimal units
                          value = value.replace(/[^0-9.,]/g, '')
                          // Replace comma with dot
                          value = value.replace(/,/g, '.')
                          // Prevent multiple dots
                          const parts = value.split('.')
                          if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('')
                          }
                          // Store as string to preserve typing state
                          setFormData({ ...formData, initial_quantity: value })
                        } else {
                          // Only allow digits for piece/package units
                          value = value.replace(/[^0-9]/g, '')
                          setFormData({ ...formData, initial_quantity: value })
                        }
                      }}
                      placeholder={editingProduct ? "0" : "0"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {editingProduct && (
                      <p className="text-xs text-gray-500 mt-1">0 bırakırsanız stok değişmez, sadece ürün bilgileri güncellenir</p>
                    )}
                  </div>
                </div>
                {editingProduct && Number(formData.initial_quantity) > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.movement_type === 'in' && '✅ Stok artırılacak'}
                    {formData.movement_type === 'out' && '⚠️ Stok azaltılacak'}
                    {formData.movement_type === 'adjustment' && '🔄 Stok bu değere ayarlanacak'}
                  </p>
                )}
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
                  Ürün Aktif
                </label>
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
