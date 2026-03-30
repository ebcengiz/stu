'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, ScanBarcode, Filter, ArrowUpDown, ArrowUp, ArrowDown, ImageIcon, UploadCloud, Loader2, Package, Layers, Warehouse as WarehouseIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import BarcodeScanner from '@/components/barcode/BarcodeScanner'
import BarcodeDisplay from '@/components/barcode/BarcodeDisplay'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { toast } from 'react-hot-toast'

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
  image_url?: string | null
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
  const [uploading, setUploading] = useState(false)
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
    movement_type: 'in',
    image_url: ''
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [productsRes, categoriesRes, warehousesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/warehouses')
        ])

        const [productsData, categoriesData, warehousesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json(),
          warehousesRes.json()
        ])

        setProducts(Array.isArray(productsData) ? productsData : [])
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setWarehouses(Array.isArray(warehousesData) ? warehousesData.filter((w: Warehouse) => w.is_active) : [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır.')
      return
    }

    setUploading(true)
    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
      setFormData(prev => ({ ...prev, image_url: data.url }))
      toast.success('Görsel yüklendi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }))
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
        sku: formData.sku?.trim() || null,
        barcode: formData.barcode?.trim() || null,
        description: formData.description?.trim() || null,
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
      toast.success(editingProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!')
    } catch (error: any) {
      toast.error(error.message || 'Ürün kaydedilemedi')
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
      movement_type: 'in',
      image_url: product.image_url || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete product')
      fetchProducts()
      toast.success('Ürün silindi')
    } catch (error) {
      toast.error('Ürün silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '', sku: '', barcode: '', description: '', price: '', purchase_price: '', tax_rate: 20, discount_rate: 0,
      currency: 'TRY', unit: 'adet', min_stock_level: '', category_id: categories[0]?.id || '', is_active: true,
      initial_quantity: '', warehouse_id: warehouses[0]?.id || '', movement_type: 'in', image_url: ''
    })
    setShowModal(true)
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCategoryLoading(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategoryData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Kategori eklenemedi')
      }

      await fetchCategories()
      setFormData(prev => ({ ...prev, category_id: data.id }))
      setShowNewCategoryModal(false)
      setNewCategoryData({ name: '', description: '' })
      toast.success('Yeni kategori eklendi ve seçildi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNewCategoryLoading(false)
    }
  }

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewWarehouseLoading(true)
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWarehouseData),
      })
      if (!res.ok) throw new Error('Depo eklenemedi')
      const newWh = await res.json()
      await fetchWarehouses()
      setFormData(prev => ({ ...prev, warehouse_id: newWh.id }))
      setShowNewWarehouseModal(false)
      setNewWarehouseData({ name: '', location: '', is_active: true })
      toast.success('Yeni depo eklendi ve seçildi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNewWarehouseLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return []
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter ? product.category_id === categoryFilter : true
      const matchesWarehouse = warehouseFilter ? product.stock?.some(s => s.warehouse_id === warehouseFilter && Number(s.quantity) > 0) : true
      const totalStock = calculateTotalStock(product.stock)
      const isLowStock = stockFilter === 'low-stock' ? totalStock <= product.min_stock_level : true
      return matchesSearch && matchesCategory && matchesWarehouse && isLowStock
    })
  }, [products, searchTerm, categoryFilter, warehouseFilter, stockFilter])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]
    if (!sortConfig) return sorted
    
    return sorted.sort((a, b) => {
      const { key, direction } = sortConfig
      const aValue = a[key] ?? ''
      const bValue = b[key] ?? ''
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredProducts, sortConfig])

  if (loading && products.length === 0) return <div className="p-8">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-black">Ürünler</h1>
          <p className="mt-2 text-gray-600">Ürünlerinizi yönetin ve stok takibi yapın</p>
        </div>
        <Button onClick={openNewModal} className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary-100"><Plus className="mr-2 h-5 w-5" />Yeni Ürün</Button>
      </div>

      <Card className="border-0 shadow-xl shadow-gray-100/50 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <CardTitle className="text-lg font-black text-gray-800 uppercase tracking-widest">Ürün Listesi</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className={`h-10 px-4 rounded-xl flex items-center gap-2 font-bold transition-all ${showFilters || categoryFilter || warehouseFilter || stockFilter === 'low-stock' ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-gray-200 text-gray-600'}`}><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filtrele</span></Button>
                  <Button type="button" variant="outline" onClick={() => setShowBarcodeScanner(true)} className="h-10 px-4 rounded-xl flex items-center gap-2 font-bold border-gray-200 text-gray-600"><ScanBarcode className="h-4 w-4" /><span className="hidden sm:inline">Barkod</span></Button>
                </div>
              </div>
            </div>
            {showFilters && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-inner grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Kategori</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl py-2.5 px-3 text-[11px] font-semibold text-gray-700 focus:ring-2 focus:ring-primary-500 transition-all">
                    <option value="">Tüm Kategoriler</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Depo</label><select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl py-2.5 px-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary-500"><option value="">Tüm Depolar</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</select></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Durum</label><label className={`flex items-center justify-between w-full bg-gray-50 rounded-xl py-2.5 px-4 text-sm font-bold cursor-pointer transition-all ${stockFilter === 'low-stock' ? 'bg-red-50 text-red-700 ring-2 ring-red-200' : 'text-gray-600 hover:bg-gray-100'}`}><span>Düşük Stok</span><input type="checkbox" checked={stockFilter === 'low-stock'} onChange={(e) => setStockFilter(e.target.checked ? 'low-stock' : 'all')} className="h-4 w-4 rounded-full border-gray-300 text-red-600 focus:ring-red-500" /></label></div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-600 transition-colors min-w-[140px]" onClick={() => requestSort('name')}>
                    <div className="flex items-center">Görsel / Ürün {getSortIcon('name')}</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-600 transition-colors min-w-[100px]" onClick={() => requestSort('sku')}>
                    <div className="flex items-center">SKU {getSortIcon('sku')}</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider min-w-[120px]">Kategori</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider min-w-[120px]">Fiyat Bilgisi</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider text-center min-w-[100px]">KDV/İSK</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider text-right min-w-[110px]">Toplam Stok</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider min-w-[100px]">Durum</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider min-w-[100px]">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {sortedProducts.length > 0 ? (
                  sortedProducts.map((product) => {
                    const totalStock = calculateTotalStock(product.stock)
                    const isLow = totalStock <= product.min_stock_level
                    const symbol = CURRENCY_SYMBOLS[product.currency || 'TRY'] || product.currency || '₺'
                    return (
                      <tr key={product.id} className={`group transition-colors ${isLow ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50/80'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="h-12 w-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100 group-hover:border-primary-200 transition-all shadow-sm">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                  <ImageIcon className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">{product.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 bg-gray-50/50 group-hover:bg-white transition-colors">{product.sku || '---'}</td>
                        <td className="px-6 py-4">
                          <div className="min-w-[120px]">
                            <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider inline-block text-center leading-tight">
                              {product.categories?.name || 'Genel'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-emerald-600">{symbol}{Number(product.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            {product.purchase_price && (<span className="text-[10px] font-bold text-gray-400">Maliyet: {symbol}{Number(product.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">% {product.tax_rate || 0} KDV</span><span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">% {product.discount_rate || 0} İSK</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><span className={`text-sm font-black ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{totalStock.toFixed(2)} <span className="text-[10px] text-gray-400 uppercase ml-0.5">{product.unit}</span></span></td>
                        <td className="px-6 py-4 whitespace-nowrap">{product.is_active ? (<span className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full ${isLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>{isLow ? 'Düşük Stok' : 'Aktif'}</span>) : (<span className="px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full bg-gray-100 text-gray-500">Pasif</span>)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-2"><button onClick={() => handleEdit(product)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    )
                  })
                ) : (
                  <tr><td colSpan={9} className="px-6 py-20 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><Package className="h-12 w-12 text-gray-200" /><span className="text-sm font-bold uppercase tracking-widest">Aranan kriterlere uygun ürün bulunamadı.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[8px] flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-0 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100"><Package className="h-6 w-6 text-primary-500" /></div>
                <div>
                  <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Lütfen ürün detaylarını eksiksiz doldurunuz</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-200 rounded-full transition-all active:scale-90"><X className="h-6 w-6 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Side: Image Upload */}
                <div className="lg:col-span-1 space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ürün Görseli</label>
                  {formData.image_url ? (
                    <div className="relative group rounded-3xl overflow-hidden aspect-square border-2 border-gray-100 shadow-inner bg-gray-50">
                      <img src={formData.image_url} alt="Ürün" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={removeImage} className="bg-white/20 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/40 transition-all active:scale-90"><X className="h-8 w-8" /></button>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center aspect-square border-4 border-dashed border-gray-100 rounded-3xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all text-center p-10 ${uploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                      {uploading ? <Loader2 className="h-12 w-12 text-primary-500 animate-spin" /> : (
                        <>
                          <div className="p-6 bg-primary-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><UploadCloud className="h-10 w-10 text-primary-500" /></div>
                          <p className="text-[11px] font-black text-gray-800 uppercase tracking-wider mb-1">Görsel Seç</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Max 5MB</p>
                        </>
                      )}
                    </label>
                  )}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[9px] leading-relaxed text-amber-800 font-bold uppercase text-center">* Profesyonel görünüm için beyaz arka plan önerilir.</p>
                  </div>
                </div>

                {/* Right Side: Form Fields */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ürün Adı *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all" placeholder="Örn: iPhone 15 Pro Max" />
                  </div>
                  
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Kategori *</label>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1 min-w-0">
                        <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-4 pr-10 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none text-[11px] font-semibold text-gray-700 transition-all bg-white shadow-sm appearance-none truncate">
                          <option value="">Seçiniz</option>
                          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                      <button type="button" onClick={() => setShowNewCategoryModal(true)} className="flex-shrink-0 h-[52px] w-[52px] flex items-center justify-center bg-primary-50 text-primary-600 rounded-2xl hover:bg-primary-100 transition-all active:scale-95 border-2 border-primary-100" title="Yeni Kategori Ekle"><Plus className="h-5 w-5" /></button>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">SKU (Stok Kodu)</label>
                    <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all uppercase" placeholder="ABC-123" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Barkod No</label>
                    <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all" placeholder="8690000000000" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Birim</label>
                    <select required value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-5 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all bg-white shadow-sm appearance-none"><option value="adet">Adet</option><option value="kg">Kilogram</option><option value="litre">Litre</option><option value="metre">Metre</option><option value="paket">Paket</option></select>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="pt-8 border-t border-dashed border-gray-200">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary-500"></div> Fiyatlandırma ve Vergi</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Para Birimi</label><select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold text-gray-900 bg-white"><option value="TRY">TRY (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Satış Fiyatı</label><input type="text" value={formData.price} onFocus={() => setFormData({...formData, price: ''})} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3 border-2 border-emerald-100 bg-emerald-50/20 rounded-xl focus:border-emerald-500 outline-none font-black text-emerald-700" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Alış Fiyatı</label><input type="text" value={formData.purchase_price} onFocus={() => setFormData({...formData, purchase_price: ''})} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} className="w-full px-4 py-3 border-2 border-red-100 bg-red-50/20 rounded-xl focus:border-red-500 outline-none font-black text-red-700" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">KDV (%)</label><input type="number" value={formData.tax_rate} onFocus={() => setFormData({...formData, tax_rate: '' as any})} onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold text-gray-900" /></div>
                </div>
              </div>

              {/* Stock and Advanced Section */}
              <div className="pt-8 border-t border-dashed border-gray-200">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary-500"></div> Stok Ayarları</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Min. Stok Uyarı</label><input type="text" value={formData.min_stock_level} onFocus={() => setFormData({...formData, min_stock_level: '' as any})} onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold text-gray-900" /></div>
                  
                  {!editingProduct && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Başlangıç Deposu *</label>
                        <div className="flex gap-2">
                          <select required value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold text-gray-900 bg-white">
                            <option value="">Seçiniz</option>
                            {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                          </select>
                          <button type="button" onClick={() => setShowNewWarehouseModal(true)} className="p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-all active:scale-95 border-2 border-primary-100" title="Yeni Depo Ekle"><Plus className="h-5 w-5" /></button>
                        </div>
                      </div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Başlangıç Miktarı</label><input type="text" value={formData.initial_quantity} onFocus={() => setFormData({...formData, initial_quantity: '' as any})} onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-bold text-gray-900" /></div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-dashed border-gray-200 pt-8"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ürün Açıklaması</label><textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none font-bold text-gray-900 transition-all shadow-sm" placeholder="Ürün hakkında kısa bir açıklama..." /></div>

              <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="px-10 h-14 rounded-2xl font-bold text-gray-500 border-2">Vazgeç</Button>
                <Button type="submit" disabled={loading} className="px-14 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 transition-all active:scale-95">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (editingProduct ? 'GÜNCELLE' : 'ÜRÜNÜ KAYDET')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10001] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-0 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-7 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 rounded-xl"><Layers className="h-5 w-5 text-primary-600" /></div>
                <h3 className="text-base font-black text-gray-800 uppercase tracking-widest">Yeni Kategori</h3>
              </div>
              <button onClick={() => setShowNewCategoryModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all active:scale-90"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Kategori İsmi *</label>
                <input 
                  type="text" 
                  required 
                  value={newCategoryData.name} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300" 
                  placeholder="Örn: Elektronik Ürünler" 
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Açıklama (Opsiyonel)</label>
                <textarea 
                  rows={3} 
                  value={newCategoryData.description} 
                  onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300" 
                  placeholder="Kategori hakkında kısa bir not..." 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewCategoryModal(false)} className="flex-1 h-14 rounded-2xl font-bold text-gray-500 border-2">İptal</Button>
                <Button type="submit" disabled={newCategoryLoading} className="flex-[1.5] h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 transition-all active:scale-95">
                  {newCategoryLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'KAYDET'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Warehouse Modal */}
      {showNewWarehouseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10001] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-0 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-7 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 rounded-xl"><WarehouseIcon className="h-5 w-5 text-primary-600" /></div>
                <h3 className="text-base font-black text-gray-800 uppercase tracking-widest">Yeni Depo</h3>
              </div>
              <button onClick={() => setShowNewWarehouseModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all active:scale-90"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Depo İsmi *</label>
                <input 
                  type="text" 
                  required 
                  value={newWarehouseData.name} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewWarehouseData({...newWarehouseData, name: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300" 
                  placeholder="Örn: Kuzey Lojistik Merkezi" 
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Depo Konumu</label>
                <LocationPicker 
                  value={newWarehouseData.location} 
                  onChange={(location) => setNewWarehouseData({...newWarehouseData, location})} 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewWarehouseModal(false)} className="flex-1 h-14 rounded-2xl font-bold text-gray-500 border-2">İptal</Button>
                <Button type="submit" disabled={newWarehouseLoading} className="flex-[1.5] h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 transition-all active:scale-95">
                  {newWarehouseLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'KAYDET'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-sm font-black uppercase tracking-widest">Barkod Tarat</h2>
              <button onClick={() => setShowBarcodeScanner(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8">
              <BarcodeScanner 
                onScan={(barcode) => {
                  setFormData(prev => ({ ...prev, barcode }));
                  setShowBarcodeScanner(false);
                  toast.success('Barkod tarandı: ' + barcode);
                }} 
                onError={(err) => toast.error('Kamera hatası: ' + err)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary-500" /></div>}>
      <ProductsPageContent />
    </Suspense>
  )
}
