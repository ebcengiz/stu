'use client'

import { useState, useEffect, Suspense } from 'react'
import { Plus, Search, Edit2, Trash2, X, ScanBarcode, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import BarcodeScanner from '@/components/barcode/BarcodeScanner'
import BarcodeDisplay from '@/components/barcode/BarcodeDisplay'
import { CURRENCY_SYMBOLS } from '@/lib/currency'

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/warehouse/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded flex items-center justify-center">Harita yükleniyor...</div>
})

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
  price: number | null
  purchase_price: number | null
  tax_rate: number | null
  discount_rate: number | null
  currency: string
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

  const uniqueStockByWarehouse = new Map<string, number>()

  stockRecords.forEach(record => {
    const warehouseId = record.warehouse_id || 'default'
    if (!uniqueStockByWarehouse.has(warehouseId)) {
      uniqueStockByWarehouse.set(warehouseId, Number(record.quantity || 0))
    }
  })

  return Array.from(uniqueStockByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)
}

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false)
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false)
  const [newCategoryLoading, setNewCategoryLoading] = useState(false)
  const [newWarehouseLoading, setNewWarehouseLoading] = useState(false)
  const [newCategoryData, setNewCategoryData] = useState({ name: '', description: '' })
  const [newWarehouseData, setNewWarehouseData] = useState({ name: '', location: '', is_active: true })
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low-stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    price: '' as string | number,
    purchase_price: '' as string | number,
    tax_rate: 20 as string | number,
    discount_rate: 0 as string | number,
    currency: 'TRY',
    unit: 'adet',
    min_stock_level: '' as string | number,
    category_id: '',
    is_active: true,
    initial_quantity: '' as string | number,
    warehouse_id: '',
    movement_type: 'in'
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchWarehouses()
  }, [])

  useEffect(() => {
    const filter = searchParams.get('filter')
    setStockFilter(filter === 'low-stock' ? 'low-stock' : 'all')
  }, [searchParams])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(Array.isArray(data) ? data.filter((w: Warehouse) => w.is_active) : [])
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Product) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary-600" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const cleanedData = {
        ...formData,
        sku: formData.sku.trim() || null,
        barcode: formData.barcode.trim() || null,
        description: formData.description.trim() || null,
        price: typeof formData.price === 'string' ? parseFloat(formData.price) || 0 : formData.price,
        purchase_price: typeof formData.purchase_price === 'string' ? parseFloat(formData.purchase_price) || 0 : formData.purchase_price,
        tax_rate: typeof formData.tax_rate === 'string' ? parseFloat(formData.tax_rate) || 0 : formData.tax_rate,
        discount_rate: typeof formData.discount_rate === 'string' ? parseFloat(formData.discount_rate) || 0 : formData.discount_rate,
        min_stock_level: typeof formData.min_stock_level === 'string' ? parseFloat(formData.min_stock_level) || 0 : formData.min_stock_level,
        initial_quantity: typeof formData.initial_quantity === 'string' ? parseFloat(formData.initial_quantity) || 0 : formData.initial_quantity,
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
      fetchProducts()
      alert(editingProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!')
    } catch (error: any) {
      alert(error.message || 'Ürün kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    const defaultWarehouse = product.stock?.[0]?.warehouse_id || warehouses[0]?.id || ''
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      price: product.price || '',
      purchase_price: product.purchase_price || '',
      tax_rate: product.tax_rate || 20,
      discount_rate: product.discount_rate || 0,
      currency: product.currency || 'TRY',
      unit: product.unit,
      min_stock_level: product.min_stock_level || '',
      category_id: product.category_id || '',
      is_active: product.is_active,
      initial_quantity: '',
      warehouse_id: defaultWarehouse,
      movement_type: 'in'
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete product')
      fetchProducts()
    } catch (error) {
      alert('Ürün silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '', sku: '', barcode: '', description: '', price: '', purchase_price: '', tax_rate: 20, discount_rate: 0,
      currency: 'TRY', unit: 'adet', min_stock_level: '', category_id: '', is_active: true,
      initial_quantity: '', warehouse_id: warehouses[0]?.id || '', movement_type: 'in'
    })
    setShowModal(true)
  }

  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter ? product.category_id === categoryFilter : true
    const matchesWarehouse = warehouseFilter ? product.stock?.some(s => s.warehouse_id === warehouseFilter && Number(s.quantity) > 0) : true
    const totalStock = calculateTotalStock(product.stock)
    const isLowStock = stockFilter === 'low-stock' ? totalStock <= product.min_stock_level : true
    return matchesSearch && matchesCategory && matchesWarehouse && isLowStock
  }) : []

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, direction } = sortConfig
    const aValue = a[key] ?? ''
    const bValue = b[key] ?? ''
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })

  if (loading && products.length === 0) return <div className="p-8">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ürünler</h1>
          <p className="mt-2 text-gray-600">Ürünlerinizi yönetin</p>
        </div>
        <Button onClick={openNewModal}><Plus className="mr-2 h-4 w-4" />Yeni Ürün</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <CardTitle>Ürün Listesi</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 ${showFilters || categoryFilter || warehouseFilter || stockFilter === 'low-stock' ? 'border-primary-500 text-primary-700 bg-primary-50' : ''}`}><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filtrele</span></Button>
                  <Button type="button" variant="outline" onClick={() => setShowBarcodeScanner(true)} className="flex items-center gap-2"><ScanBarcode className="h-4 w-4" /><span className="hidden sm:inline">Barkod</span></Button>
                </div>
              </div>
            </div>
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500 uppercase">Kategori</label><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-sm"><option value="">Tümü</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500 uppercase">Depo</label><select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-sm"><option value="">Tümü</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500 uppercase">Durum</label><label className={`flex items-center justify-between w-full bg-white border rounded-md py-2 px-3 text-sm cursor-pointer ${stockFilter === 'low-stock' ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300'}`}><span>Düşük Stok</span><input type="checkbox" checked={stockFilter === 'low-stock'} onChange={(e) => setStockFilter(e.target.checked ? 'low-stock' : 'all')} className="h-4 w-4" /></label></div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('name')}>
                    <div className="flex items-center">Ürün {getSortIcon('name')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('sku')}>
                    <div className="flex items-center">SKU {getSortIcon('sku')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KDV / İsk.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kar Oranı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedProducts.length > 0 ? (
                  sortedProducts.map((product) => {
                    const totalStock = calculateTotalStock(product.stock)
                    const isLow = totalStock <= product.min_stock_level
                    const symbol = CURRENCY_SYMBOLS[product.currency || 'TRY'] || product.currency || '₺'
                    return (
                      <tr key={product.id} className={isLow ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categories?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col"><span className="font-medium text-green-700">S: {symbol}{Number(product.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>{product.purchase_price && (<span className="text-xs text-red-600">A: {symbol}{Number(product.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div className="flex flex-col text-xs"><span className="text-blue-600">KDV: %{product.tax_rate || 0}</span><span className="text-orange-600">İsk: %{product.discount_rate || 0}</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{product.purchase_price && Number(product.purchase_price) > 0 ? (() => { const profit = (Number(product.price) || 0) - (Number(product.purchase_price) || 0); const margin = (profit / Number(product.purchase_price)) * 100; return <span className={`font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>%{margin.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span> })() : <span className="text-gray-400">-</span>}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{totalStock.toFixed(2)} {product.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{product.is_active ? (<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{isLow ? 'Düşük Stok' : 'Aktif'}</span>) : (<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Pasif</span>)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex gap-2"><button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    )
                  })
                ) : (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">Ürün bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Ürün Adı *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Kategori *</label><select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="">Kategori Seçin</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">SKU</label><input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Barkod</label><input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Para Birimi</label><select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="TRY">TRY (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Satış Fiyatı</label><input type="text" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Alış Fiyatı</label><input type="text" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">KDV (%)</label><input type="number" value={formData.tax_rate} onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">İskonto (%)</label><input type="number" value={formData.discount_rate} onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Birim *</label><select required value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="adet">Adet</option><option value="kg">Kilogram</option><option value="litre">Litre</option><option value="metre">Metre</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Min. Stok</label><input type="text" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
              </div>
              {!editingProduct && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Depo *</label><select required value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="">Depo Seçin</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Stoku</label><input type="text" value={formData.initial_quantity} onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })} className="w-full px-4 py-2 border rounded-md" /></div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowModal(false)}>İptal</Button><Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <ProductsPageContent />
    </Suspense>
  )
}
