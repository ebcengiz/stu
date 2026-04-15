'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ScanBarcode,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  UploadCloud,
  Loader2,
  Package,
  Layers,
  Warehouse as WarehouseIcon,
  ChevronDown,
  Banknote,
  Boxes,
  FileText,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import BarcodeScanner from '@/components/barcode/BarcodeScanner'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { looseToTrInputString, parseTrNumberInput } from '@/lib/tr-number-input'

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/warehouse/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">Harita yükleniyor...</div>
})

/** Satış/alışta kullanılabilecek birim seçenekleri (çoklu seçim) */
const UNIT_OPTIONS = [
  'adet',
  'kg',
  'g',
  'ton',
  'litre',
  'ml',
  'metre',
  'cm',
  'm²',
  'm³',
  'paket',
  'koli',
  'kutu',
  'set',
  'saat',
  'gün',
  'ay',
  'yıl',
  'personel-gün',
]

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
  product_kind?: string | null
  brand?: string | null
  gtip?: string | null
  sale_units?: string[] | null
  shelf_location_id?: string | null
  shelf_locations?: { id: string; name: string } | null
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
  const [showNewShelfModal, setShowNewShelfModal] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfLoading, setNewShelfLoading] = useState(false)
  const [shelfLocations, setShelfLocations] = useState<{ id: string; name: string }[]>([])
  const [accordionOpen, setAccordionOpen] = useState({
    def: true,
    price: false,
    stock: false,
    detail: false,
  })
  const [customUnitDraft, setCustomUnitDraft] = useState('')
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
    tax_rate: '20' as string | number,
    discount_rate: '0' as string | number,
    currency: 'TRY',
    unit: 'adet',
    min_stock_level: '' as string | number,
    category_id: '',
    is_active: true,
    initial_quantity: '' as string | number,
    warehouse_id: '',
    movement_type: 'in',
    image_url: '',
    product_kind: 'stocked' as 'stocked' | 'service' | 'consulting',
    brand: '',
    gtip: '',
    sale_units: ['adet'] as string[],
    shelf_location_id: '',
  })
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [productsRes, categoriesRes, warehousesRes, shelvesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/warehouses'),
          fetch('/api/shelf-locations'),
        ])

        const [productsData, categoriesData, warehousesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json(),
          warehousesRes.json(),
        ])

        let shelvesData: unknown = []
        if (shelvesRes.ok) {
          try {
            shelvesData = await shelvesRes.json()
          } catch {
            shelvesData = []
          }
        }

        setProducts(Array.isArray(productsData) ? productsData : [])
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setWarehouses(Array.isArray(warehousesData) ? warehousesData.filter((w: Warehouse) => w.is_active) : [])
        setShelfLocations(Array.isArray(shelvesData) ? shelvesData : [])
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

  const fetchShelfLocations = async () => {
    try {
      const response = await fetch('/api/shelf-locations')
      const data = await response.json()
      setShelfLocations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching shelf locations:', error)
    }
  }

  const toggleSaleUnit = (u: string) => {
    setFormData((prev) => {
      let next = [...prev.sale_units]
      if (next.includes(u)) {
        if (next.length <= 1) return prev
        next = next.filter((x) => x !== u)
        const newUnit = prev.unit === u ? next[0] : prev.unit
        return { ...prev, sale_units: next, unit: newUnit }
      }
      return { ...prev, sale_units: [...next, u] }
    })
  }

  const addCustomUnit = () => {
    const u = customUnitDraft.trim().toLowerCase()
    if (!u) return
    setFormData((prev) => ({
      ...prev,
      sale_units: prev.sale_units.includes(u) ? prev.sale_units : [...prev.sale_units, u],
      unit: u,
    }))
    setCustomUnitDraft('')
  }

  const handleCreateShelfInModal = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newShelfName.trim()
    if (!name) return
    setNewShelfLoading(true)
    try {
      const res = await fetch('/api/shelf-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Raf eklenemedi')
      await fetchShelfLocations()
      setFormData((prev) => ({ ...prev, shelf_location_id: data.id }))
      setShowNewShelfModal(false)
      setNewShelfName('')
      toast.success('Raf yeri eklendi ve seçildi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNewShelfLoading(false)
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
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-500" />
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
        brand: formData.brand?.trim() || null,
        gtip: formData.gtip?.trim() || null,
        price: parseTrNumberInput(String(formData.price)) || 0,
        purchase_price: parseTrNumberInput(String(formData.purchase_price)) || 0,
        tax_rate: parseTrNumberInput(String(formData.tax_rate)) || 0,
        discount_rate: parseTrNumberInput(String(formData.discount_rate)) || 0,
        min_stock_level: parseTrNumberInput(String(formData.min_stock_level)) || 0,
        initial_quantity: parseTrNumberInput(String(formData.initial_quantity)) || 0,
        product_kind: formData.product_kind,
        sale_units: formData.sale_units,
        shelf_location_id: formData.shelf_location_id || null,
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
    const rawSu = product.sale_units
    const su = Array.isArray(rawSu) ? rawSu : null
    const saleUnits =
      su && su.length > 0 ? su : product.unit ? [product.unit] : ['adet']
    const kind = product.product_kind === 'service' || product.product_kind === 'consulting' ? product.product_kind : 'stocked'
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      price: looseToTrInputString(product.price ?? 0),
      purchase_price: looseToTrInputString(product.purchase_price ?? 0),
      tax_rate: looseToTrInputString(product.tax_rate ?? 20, 2),
      discount_rate: looseToTrInputString(product.discount_rate ?? 0, 2),
      currency: product.currency || 'TRY',
      unit: product.unit || saleUnits[0] || 'adet',
      min_stock_level: looseToTrInputString(product.min_stock_level ?? 0),
      category_id: product.category_id || '',
      is_active: product.is_active,
      initial_quantity: '',
      warehouse_id: defaultWarehouse,
      movement_type: 'in',
      image_url: product.image_url || '',
      product_kind: kind,
      brand: product.brand || '',
      gtip: product.gtip || '',
      sale_units: saleUnits,
      shelf_location_id:
        product.shelf_location_id ||
        (product.shelf_locations && typeof product.shelf_locations === 'object' && 'id' in product.shelf_locations
          ? (product.shelf_locations as { id: string }).id
          : '') ||
        '',
    })
    setAccordionOpen({ def: true, price: false, stock: false, detail: false })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete product')
      fetchProducts()
      toast.success('Ürün silindi')
    } catch {
      toast.error('Ürün silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      price: '',
      purchase_price: '',
      tax_rate: '20',
      discount_rate: '0',
      currency: 'TRY',
      unit: 'adet',
      min_stock_level: '',
      category_id: categories[0]?.id || '',
      is_active: true,
      initial_quantity: '',
      warehouse_id: warehouses[0]?.id || '',
      movement_type: 'in',
      image_url: '',
      product_kind: 'stocked',
      brand: '',
      gtip: '',
      sale_units: ['adet'],
      shelf_location_id: '',
    })
    setAccordionOpen({ def: true, price: false, stock: false, detail: false })
    setCustomUnitDraft('')
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

  if (loading && products.length === 0) return <div className="p-8 text-gray-500">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ürünler</h1>
          <p className="mt-2 text-gray-500">Ürünlerinizi yönetin ve stok takibi yapın</p>
        </div>
        <Button onClick={openNewModal} className="h-12 px-6 rounded-xl font-bold"><Plus className="mr-2 h-5 w-5" />Yeni Ürün</Button>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <CardTitle className="text-lg font-bold text-gray-700 uppercase tracking-widest">Ürün Listesi</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-primary-500/30 outline-none transition-all" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className={`h-10 px-4 rounded-xl flex items-center gap-2 font-bold transition-all ${showFilters || categoryFilter || warehouseFilter || stockFilter === 'low-stock' ? 'border-primary-400 text-primary-700 bg-primary-50/50' : ''}`}><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filtrele</span></Button>
                  <Button type="button" variant="outline" onClick={() => setShowBarcodeScanner(true)} className="h-10 px-4 rounded-xl flex items-center gap-2 font-bold"><ScanBarcode className="h-4 w-4" /><span className="hidden sm:inline">Barkod</span></Button>
                </div>
              </div>
            </div>
            {showFilters && (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Kategori</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-700 focus:ring-2 focus:ring-primary-500/30 transition-all">
                    <option value="">Tüm Kategoriler</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Depo</label><select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-700 focus:ring-2 focus:ring-primary-500/30"><option value="">Tüm Depolar</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</select></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Durum</label><label className={`flex items-center justify-between w-full bg-gray-50 rounded-xl py-2.5 px-4 text-sm font-bold cursor-pointer transition-all ${stockFilter === 'low-stock' ? 'bg-red-50 text-red-500 ring-2 ring-red-200' : 'text-gray-500 hover:bg-gray-100'}`}><span>Düşük Stok</span><input type="checkbox" checked={stockFilter === 'low-stock'} onChange={(e) => setStockFilter(e.target.checked ? 'low-stock' : 'all')} className="h-4 w-4 rounded-full border-gray-200 text-red-600 focus:ring-red-200 bg-gray-100" /></label></div>
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
              <tbody className="divide-y divide-gray-100">
                {sortedProducts.length > 0 ? (
                  sortedProducts.map((product) => {
                    const totalStock = calculateTotalStock(product.stock)
                    const isLow = totalStock <= product.min_stock_level
                    const symbol = CURRENCY_SYMBOLS[product.currency || 'TRY'] || product.currency || '₺'
                    return (
                      <tr key={product.id} className={`group transition-colors ${isLow ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="h-12 w-12 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 group-hover:border-primary-300 transition-all">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-500">
                                  <ImageIcon className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-bold text-gray-700 group-hover:text-primary-700 transition-colors leading-tight">{product.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{product.sku || '---'}</td>
                        <td className="px-6 py-4">
                          <div className="min-w-[120px]">
                            <span className="px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider inline-block text-center leading-tight">
                              {product.categories?.name || 'Genel'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-primary-600">{symbol}{Number(product.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            {product.purchase_price && (<span className="text-[10px] font-bold text-gray-400">Maliyet: {symbol}{Number(product.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">% {product.tax_rate || 0} KDV</span><span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">% {product.discount_rate || 0} İSK</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><span className={`text-sm font-black ${isLow ? 'text-red-500' : 'text-gray-700'}`}>{totalStock.toFixed(2)} <span className="text-[10px] text-gray-400 uppercase ml-0.5">{product.unit}</span></span></td>
                        <td className="px-6 py-4 whitespace-nowrap">{product.is_active ? (<span className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full ${isLow ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-primary-50 text-primary-600'}`}>{isLow ? 'Düşük Stok' : 'Aktif'}</span>) : (<span className="px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full bg-gray-50 text-gray-400">Pasif</span>)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-2"><button onClick={() => handleEdit(product)} className="p-2 text-primary-600 hover:bg-primary-50/50 rounded-xl transition-all active:scale-90"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50/50 rounded-xl transition-all active:scale-90"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    )
                  })
                ) : (
                  <tr><td colSpan={9} className="px-6 py-20 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><Package className="h-12 w-12 text-gray-600" /><span className="text-sm font-bold uppercase tracking-widest">Aranan kriterlere uygun ürün bulunamadı.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="bg-[#FAFAF7] rounded-2xl shadow-xl shadow-primary-900/5 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-primary-200/60 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-primary-100 bg-white/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 rounded-2xl border border-primary-200/80"><Package className="h-6 w-6 text-primary-600" /></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Bölümleri açıp bilgileri doldurun</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-3 hover:bg-primary-50 rounded-full transition-all active:scale-90"><X className="h-6 w-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-3">
                {/* 1 — Ürün / hizmet tanımı */}
                <div className="rounded-2xl border border-primary-200/70 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen((a) => ({ ...a, def: !a.def }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-primary-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Tag className="h-5 w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm">Ürün / hizmet tanımı</div>
                        <div className="text-[11px] text-gray-500 truncate">Ad, tip, birimler, kod, barkod, kategori, marka</div>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary-500 shrink-0 transition-transform ${accordionOpen.def ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.def && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-primary-100/90 bg-[#F5F5F0]/40">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün adı *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 outline-none font-semibold text-gray-800"
                          placeholder="Ürün veya hizmet adı"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün tipi</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {([
                            { v: 'stocked' as const, label: 'Stoklu ürün' },
                            { v: 'service' as const, label: 'Stoksuz (hizmet)' },
                            { v: 'consulting' as const, label: 'Stoksuz (danışmanlık)' },
                          ]).map((opt) => (
                            <label
                              key={opt.v}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer text-sm font-semibold transition-all ${
                                formData.product_kind === opt.v
                                  ? 'border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-200'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name="product_kind"
                                className="sr-only"
                                checked={formData.product_kind === opt.v}
                                onChange={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    product_kind: opt.v,
                                    shelf_location_id: opt.v === 'stocked' ? prev.shelf_location_id : '',
                                  }))
                                }
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Satış / alış birimleri</label>
                        <p className="text-[11px] text-gray-500">Bu ürünle kullanılabilecek tüm birimleri seçin; varsayılan birim aşağıdan belirlenir.</p>
                        <div className="flex flex-wrap gap-2">
                          {UNIT_OPTIONS.map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => toggleSaleUnit(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                formData.sale_units.includes(u)
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center pt-1">
                          <input
                            type="text"
                            value={customUnitDraft}
                            onChange={(e) => setCustomUnitDraft(e.target.value)}
                            placeholder="Özel birim (ör. palet)"
                            className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-primary-500 outline-none"
                          />
                          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={addCustomUnit}>
                            Ekle
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Varsayılan birim *</label>
                          <select
                            required
                            value={formData.unit}
                            onChange={(e) => {
                              const v = e.target.value
                              setFormData((prev) => ({
                                ...prev,
                                unit: v,
                                sale_units: prev.sale_units.includes(v) ? prev.sale_units : [...prev.sale_units, v],
                              }))
                            }}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800"
                          >
                            {formData.sale_units.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kategori *</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1 min-w-0">
                              <select
                                required
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                className="w-full px-3 pr-9 py-3 bg-white border border-gray-200 rounded-xl text-sm appearance-none truncate"
                              >
                                <option value="">Seçiniz</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowNewCategoryModal(true)}
                              className="h-[46px] w-[46px] flex items-center justify-center bg-primary-50 text-primary-600 rounded-xl border border-primary-200 shrink-0"
                              title="Yeni kategori"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Marka</label>
                          <input
                            type="text"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800"
                            placeholder="Varsa marka adı"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün kodu (SKU)</label>
                          <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm uppercase"
                            placeholder="Opsiyonel"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Barkod</label>
                          <input
                            type="text"
                            value={formData.barcode}
                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm"
                            placeholder="Opsiyonel"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2 — Fiyatlandırma */}
                <div className="rounded-2xl border border-primary-200/70 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen((a) => ({ ...a, price: !a.price }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-primary-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Banknote className="h-5 w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm">Fiyatlandırma</div>
                        <div className="text-[11px] text-gray-500 truncate">Alış, satış, para birimi, KDV</div>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary-500 shrink-0 transition-transform ${accordionOpen.price ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.price && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-primary-100/90 bg-[#F5F5F0]/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Alış fiyatı</label>
                          <TrNumberInput
                            value={String(formData.purchase_price ?? '')}
                            onChange={(v) => setFormData({ ...formData, purchase_price: v })}
                            className="w-full px-4 py-3 bg-white border border-primary-200/80 rounded-xl font-bold text-primary-800"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Satış fiyatı</label>
                          <TrNumberInput
                            value={String(formData.price ?? '')}
                            onChange={(v) => setFormData({ ...formData, price: v })}
                            className="w-full px-4 py-3 bg-primary-50/60 border border-primary-200 rounded-xl font-black text-primary-700"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Para birimi</label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800"
                          >
                            <option value="TRY">TRY (₺)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">KDV oranı (%)</label>
                          <TrNumberInput
                            value={String(formData.tax_rate ?? '')}
                            onChange={(v) => setFormData({ ...formData, tax_rate: v })}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 — Stok yönetimi */}
                <div className="rounded-2xl border border-primary-200/70 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen((a) => ({ ...a, stock: !a.stock }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-primary-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Boxes className="h-5 w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm">Stok yönetimi</div>
                        <div className="text-[11px] text-gray-500 truncate">Depo, başlangıç, kritik seviye, raf yeri</div>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary-500 shrink-0 transition-transform ${accordionOpen.stock ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.stock && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-primary-100/90 bg-[#F5F5F0]/40">
                      {formData.product_kind !== 'stocked' ? (
                        <p className="text-sm text-gray-600 py-2">
                          Hizmet ve danışmanlık kayıtlarında stok ve depo takibi kullanılmaz. Bu bölüm yalnızca stoklu ürünler içindir.
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kritik stok seviyesi</label>
                              <TrNumberInput
                                value={String(formData.min_stock_level ?? '')}
                                onChange={(v) => setFormData({ ...formData, min_stock_level: v })}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold"
                              />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Raf yeri</label>
                                <Link
                                  href="/dashboard/tanimlar#raf-yerleri"
                                  className="text-[11px] font-bold text-primary-600 hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Tanımlarda yönet
                                </Link>
                              </div>
                              <div className="flex gap-2">
                                <select
                                  value={formData.shelf_location_id}
                                  onChange={(e) => setFormData({ ...formData, shelf_location_id: e.target.value })}
                                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800"
                                >
                                  <option value="">Raf seçilmedi</option>
                                  {shelfLocations.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setShowNewShelfModal(true)}
                                  className="h-[46px] w-[46px] flex items-center justify-center bg-primary-50 text-primary-600 rounded-xl border border-primary-200 shrink-0"
                                  title="Hızlı raf ekle"
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-500">Depo içi özel konum (ör. A-12). Listeyi Tanımlar sayfasından da düzenleyebilirsiniz.</p>
                            </div>
                          </div>
                          {!editingProduct && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-primary-100">
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Başlangıç deposu *</label>
                                <div className="flex gap-2">
                                  <select
                                    required={formData.product_kind === 'stocked'}
                                    value={formData.warehouse_id}
                                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800"
                                  >
                                    <option value="">Seçiniz</option>
                                    {warehouses.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewWarehouseModal(true)}
                                    className="p-3 bg-primary-50 text-primary-600 rounded-xl border border-primary-200"
                                    title="Yeni depo"
                                  >
                                    <Plus className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Başlangıç stoğu</label>
                                <TrNumberInput
                                  value={String(formData.initial_quantity ?? '')}
                                  onChange={(v) => setFormData({ ...formData, initial_quantity: v })}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 4 — Detaylı bilgiler */}
                <div className="rounded-2xl border border-primary-200/70 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen((a) => ({ ...a, detail: !a.detail }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-primary-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm">Detaylı bilgiler</div>
                        <div className="text-[11px] text-gray-500 truncate">GTIP, açıklama, görsel</div>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary-500 shrink-0 transition-transform ${accordionOpen.detail ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.detail && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-primary-100/90 bg-[#F5F5F0]/40">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">GTIP numarası</label>
                        <input
                          type="text"
                          value={formData.gtip}
                          onChange={(e) => setFormData({ ...formData, gtip: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm"
                          placeholder="Örn. 8517.12.00.00.00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün açıklaması</label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-800"
                          placeholder="İsteğe bağlı açıklama"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ürün görseli</label>
                        {formData.image_url ? (
                          <div className="relative group rounded-2xl overflow-hidden max-w-xs border-2 border-primary-100 bg-white aspect-square">
                            <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={removeImage}
                                className="bg-white/90 text-gray-800 p-3 rounded-full shadow-lg"
                              >
                                <X className="h-6 w-6" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed border-primary-200 rounded-2xl cursor-pointer bg-primary-50/30 hover:bg-primary-50/60 transition-all p-6 ${
                              uploading ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            {uploading ? (
                              <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
                            ) : (
                              <>
                                <div className="p-4 bg-primary-100/50 rounded-2xl mb-3">
                                  <UploadCloud className="h-8 w-8 text-primary-600" />
                                </div>
                                <span className="text-xs font-bold text-gray-700">Görsel yükle</span>
                                <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, WEBP — en fazla 5 MB</span>
                              </>
                            )}
                          </label>
                        )}
                        <p className="text-[10px] text-amber-800/90 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                          Beyaz veya nötr arka planlı görseller liste görünümünde daha tutarlı görünür.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-primary-100 bg-white/90 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="px-8 h-12 rounded-xl font-bold border-primary-200">
                  Vazgeç
                </Button>
                <Button type="submit" disabled={loading} className="px-10 h-12 rounded-xl font-bold">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : editingProduct ? 'Güncelle' : 'Ürünü kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-[10001] p-4 animate-in fade-in duration-300">
          <div className="bg-white  rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-md overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-7 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 rounded-xl border border-primary-200"><Layers className="h-5 w-5 text-primary-600" /></div>
                <h3 className="text-base font-bold text-gray-800">Yeni Kategori</h3>
              </div>
              <button onClick={() => setShowNewCategoryModal(false)} className="p-2 hover:bg-gray-50 rounded-full transition-all active:scale-90"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Kategori İsmi *</label>
                <input 
                  type="text" 
                  required 
                  value={newCategoryData.name} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})} 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-bold text-gray-700 transition-all" 
                  placeholder="Örn: Elektronik Ürünler" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Açıklama (Opsiyonel)</label>
                <textarea 
                  rows={3} 
                  value={newCategoryData.description} 
                  onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})} 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-bold text-gray-700 transition-all" 
                  placeholder="Kategori hakkında kısa bir not..." 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewCategoryModal(false)} className="flex-1 h-12 rounded-xl font-bold">İptal</Button>
                <Button type="submit" disabled={newCategoryLoading} className="flex-[1.5] h-12 rounded-xl font-bold text-lg transition-all active:scale-95">
                  {newCategoryLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'KAYDET'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Warehouse Modal */}
      {showNewWarehouseModal && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-[10001] p-4 animate-in fade-in duration-300">
          <div className="bg-white  rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-md overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-7 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 rounded-xl border border-primary-200"><WarehouseIcon className="h-5 w-5 text-primary-600" /></div>
                <h3 className="text-base font-bold text-gray-800">Yeni Depo</h3>
              </div>
              <button onClick={() => setShowNewWarehouseModal(false)} className="p-2 hover:bg-gray-50 rounded-full transition-all active:scale-90"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Depo İsmi *</label>
                <input 
                  type="text" 
                  required 
                  value={newWarehouseData.name} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewWarehouseData({...newWarehouseData, name: e.target.value})} 
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-bold text-gray-700 transition-all" 
                  placeholder="Örn: Kuzey Lojistik Merkezi" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Depo Konumu</label>
                <LocationPicker 
                  value={newWarehouseData.location} 
                  onChange={(location) => setNewWarehouseData({...newWarehouseData, location})} 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewWarehouseModal(false)} className="flex-1 h-12 rounded-xl font-bold">İptal</Button>
                <Button type="submit" disabled={newWarehouseLoading} className="flex-[1.5] h-12 rounded-xl font-bold text-lg transition-all active:scale-95">
                  {newWarehouseLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'KAYDET'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hızlı raf yeri modalı */}
      {showNewShelfModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10002] p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAFAF7] rounded-2xl shadow-xl border border-primary-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-primary-100 flex justify-between items-center bg-white/90">
              <h3 className="text-base font-bold text-gray-800">Yeni raf yeri</h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewShelfModal(false)
                  setNewShelfName('')
                }}
                className="p-2 rounded-full hover:bg-primary-50"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateShelfInModal} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Rafı kaydettikten sonra bu üründe seçili olur. Tüm rafları{' '}
                <Link href="/dashboard/tanimlar#raf-yerleri" className="font-bold text-primary-600 hover:underline" target="_blank">
                  Tanımlar
                </Link>{' '}
                sayfasından yönetebilirsiniz.
              </p>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Raf adı *</label>
                <input
                  type="text"
                  required
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 outline-none font-semibold"
                  placeholder="Örn. A koridor — raf 04"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowNewShelfModal(false)
                    setNewShelfName('')
                  }}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={newShelfLoading} className="flex-1">
                  {newShelfLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-[100] p-4">
          <div className="bg-white  rounded-2xl overflow-hidden w-full max-w-lg shadow-xl shadow-gray-200/50 border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Barkod Tarat</h2>
              <button onClick={() => setShowBarcodeScanner(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-8">
              <BarcodeScanner 
                onScan={(barcode) => {
                  setFormData(prev => ({ ...prev, barcode }));
                  setShowBarcodeScanner(false);
                  toast.success('Barkod tarandı: ' + barcode);
                }} 
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary-600" /></div>}>
      <ProductsPageContent />
    </Suspense>
  )
}
