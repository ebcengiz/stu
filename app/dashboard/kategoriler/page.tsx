'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Package, Layers, X, Search, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  product_count?: number
  total_stock?: number
}

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  stock: Array<{
    quantity: number
    warehouses: {
      name: string
    }
  }>
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  // Product List Modal State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingStock] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryProducts = async (category: Category) => {
    setSelectedCategory(category)
    setLoadingStock(true)
    setShowProductsModal(true)
    try {
      const response = await fetch('/api/products')
      const allProducts = await response.json()
      const filtered = allProducts.filter((p: any) => p.category_id === category.id)
      setCategoryProducts(filtered)
    } catch (error) {
      console.error('Error fetching category products:', error)
    } finally {
      setLoadingStock(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // Prevent double submit
    setLoading(true)

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories'

      const method = editingCategory ? 'PUT' : 'POST'

      // Clean data: convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        description: formData.description.trim() || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) throw new Error('Failed to save category')

      setShowModal(false)
      setEditingCategory(null)
      setFormData({ name: '', description: '' })
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Kategori kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({ name: category.name, description: category.description || '' })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete category')

      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Kategori silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '' })
    setShowModal(true)
  }

  if (loading && categories.length === 0) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kategoriler</h1>
          <p className="mt-2 text-gray-600">Ürün kategorilerinizi yönetin</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kategori
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori Adı
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Açıklama
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün Sayısı
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Stok
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} onClick={() => fetchCategoryProducts(category)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
                        <span className="font-bold text-lg">{category.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{category.name}</div>
                        <div className="text-xs text-gray-400">ID: {category.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {category.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Layers className="w-3 h-3 mr-1" />
                      {category.product_count || 0} Ürün
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Package className="w-3 h-3 mr-1" />
                      {Number(category.total_stock || 0).toLocaleString('tr-TR')} Adet
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                        className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(category.id); }}
                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Layers className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900">Henüz kategori bulunmuyor</p>
                      <p className="text-sm text-gray-500 mt-1">Yeni kategori eklemek için sağ üstteki butonu kullanın.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori Adı *
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
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
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

      {/* Products Modal */}
      {showProductsModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden border-0 rounded-2xl">
            <CardBody className="p-0 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
                    <p className="text-xs text-primary-100 font-medium mt-0.5 uppercase tracking-wider">Kategorisindeki Ürünler</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProductsModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between gap-4 shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Kategori içinde ara..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Toplam:</span>
                  <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-lg text-xs font-bold border border-primary-100">
                    {categoryProducts.length} Ürün
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-0">
                {loadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
                    <p className="text-sm font-bold text-gray-500">Ürünler listeleniyor...</p>
                  </div>
                ) : categoryProducts.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ürün Bilgisi</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU / Barkod</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stok Durumu</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {categoryProducts
                        .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        .map((product) => {
                          const totalStock = product.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
                          return (
                            <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{product.name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                                  {product.sku || '---'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                                  totalStock <= 0 
                                    ? 'bg-red-50 text-red-700 border border-red-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {totalStock} {product.unit}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 rounded-lg text-[11px] font-black border-2"
                                  onClick={() => router.push(`/dashboard/urunler`)}
                                >
                                  DETAY <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                    <div className="p-6 bg-gray-50 rounded-full mb-4">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Ürün Bulunamadı</h3>
                    <p className="text-sm text-gray-500 mt-1">Bu kategoride henüz tanımlanmış bir ürün bulunmuyor.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-end">
                <Button onClick={() => setShowProductsModal(false)} className="px-8 font-bold h-11 rounded-xl">
                  Kapat
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}