'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Package, Layers, X, Search, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

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
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Kategoriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryProducts = async (category: Category) => {
    setSelectedCategory(category)
    setLoadingProducts(true)
    setShowProductsModal(true)
    try {
      const response = await fetch('/api/products')
      const allProducts = await response.json()
      const filtered = allProducts.filter((p: any) => p.category_id === category.id)
      setCategoryProducts(filtered)
    } catch (error) {
      console.error('Error fetching category products:', error)
      toast.error('Ürünler yüklenemedi')
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'

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
      toast.success(editingCategory ? 'Kategori güncellendi' : 'Yeni kategori eklendi')
    } catch {
      toast.error('İşlem başarısız oldu')
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
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete category')
      fetchCategories()
      toast.success('Kategori silindi')
    } catch {
      toast.error('Kategori silinemedi')
    }
  }

  const openNewModal = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '' })
    setShowModal(true)
  }

  if (loading && categories.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-black">Kategoriler</h1>
          <p className="mt-2 text-gray-600">Ürün kategorilerinizi yönetin ve organize edin</p>
        </div>
        <Button onClick={openNewModal} className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary-100">
          <Plus className="mr-2 h-5 w-5" /> Yeni Kategori
        </Button>
      </div>

      <Card className="border-0 shadow-xl shadow-gray-100/50 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
          <CardTitle className="text-lg font-black text-gray-800 uppercase tracking-widest">Kategori Listesi</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="w-[35%] px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori Adı</th>
                  <th className="w-[30%] px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Açıklama</th>
                  <th className="w-[20%] px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ürün Bilgisi</th>
                  <th className="w-[15%] px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {categories.map((category) => (
                  <tr key={category.id} onClick={() => fetchCategoryProducts(category)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-all shadow-sm shrink-0">
                          <Layers className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 group-hover:text-primary-600 transition-colors break-all leading-tight">{category.name}</div>
                          <div className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter mt-0.5">ID: {category.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[11px] font-medium text-gray-500 break-words leading-relaxed">
                        {category.description || '---'}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                          {category.product_count || 0} ÜRÜN
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {Number(category.total_stock || 0).toLocaleString('tr-TR')} ADET STOK
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(category); }} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90" title="Düzenle">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(category.id); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90" title="Sil">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <Layers className="h-12 w-12 text-gray-200" />
                        <span className="text-sm font-bold uppercase tracking-widest">Henüz kategori bulunmuyor</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* New/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-0 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-7 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 rounded-xl"><Layers className="h-5 w-5 text-primary-600" /></div>
                <h3 className="text-base font-black text-gray-800 uppercase tracking-widest">
                  {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all active:scale-90"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Kategori İsmi *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                  placeholder="Örn: Elektronik Ürünler"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Açıklama (Opsiyonel)</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                  placeholder="Kategori hakkında kısa bir not..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-2xl font-bold text-gray-500 border-2">İptal</Button>
                <Button type="submit" disabled={loading} className="flex-[1.5] h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 transition-all active:scale-95">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'KAYDET'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products under Category Modal */}
      {showProductsModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden border-0 rounded-3xl">
            <CardBody className="p-0 flex flex-col max-h-[85vh]">
              <div className="p-8 bg-gray-50/80 border-b flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary-100 rounded-2xl shrink-0">
                    <Layers className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest break-words leading-tight">{selectedCategory.name}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Kategorisindeki Ürünler</p>
                  </div>
                </div>
                <button onClick={() => setShowProductsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all active:scale-90 shrink-0 ml-4">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 border-b bg-white flex items-center justify-between gap-4 shrink-0 px-8">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Kategori içinde ara..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-bold transition-all"
                  />
                </div>
                <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-xl text-xs font-black border border-primary-100 uppercase tracking-wider">
                  {categoryProducts.length} ÜRÜN BULUNDU
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Ürünler listeleniyor...</p>
                  </div>
                ) : categoryProducts.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/30 sticky top-0 z-10">
                      <tr>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ürün Adı</th>
                        <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                        <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stok Durumu</th>
                        <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {categoryProducts
                        .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        .map((product) => {
                          const totalStock = product.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
                          return (
                            <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                              <td className="px-8 py-4">
                                <div className="font-black text-gray-900 group-hover:text-primary-600 transition-colors break-words leading-tight max-w-xs">{product.name}</div>
                              </td>
                              <td className="px-8 py-4">
                                <div className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 inline-block uppercase">
                                  {product.sku || '---'}
                                </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black ${
                                  totalStock <= 0 
                                    ? 'bg-red-50 text-red-700 border border-red-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                } uppercase`}>
                                  {totalStock} {product.unit}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-9 rounded-xl text-[10px] font-black border-2 transition-all active:scale-90"
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
                    <Package className="h-12 w-12 text-gray-200 mb-4" />
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Ürün Bulunamadı</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tighter">Bu kategoride henüz tanımlanmış bir ürün bulunmuyor.</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t bg-gray-50/50 shrink-0 flex justify-end">
                <Button onClick={() => setShowProductsModal(false)} className="px-10 font-black h-12 rounded-2xl shadow-lg shadow-primary-100">
                  KAPAT
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
