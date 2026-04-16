'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Edit2, Trash2, Search, Users, Warehouse, LayoutGrid, Plus, Loader2, Tag as TagIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Tag {
  id: string
  name: string
  type: 'category1' | 'category2'
  entity_type: 'customer' | 'supplier'
}

interface ShelfLocation {
  id: string
  name: string
  created_at?: string
}

interface BrandDefinition {
  id: string
  name: string
  created_at?: string
}

export default function DefinitionsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [shelves, setShelves] = useState<ShelfLocation[]>([])
  const [brands, setBrands] = useState<BrandDefinition[]>([])
  const [shelvesLoading, setShelvesLoading] = useState(true)
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [newShelfName, setNewShelfName] = useState('')
  const [newBrandName, setNewBrandName] = useState('')
  const [shelfSaving, setShelfSaving] = useState(false)
  const [brandSaving, setBrandSaving] = useState(false)
  const [editingShelf, setEditingShelf] = useState<ShelfLocation | null>(null)
  const [editingBrand, setEditingBrand] = useState<BrandDefinition | null>(null)
  const [editShelfName, setEditShelfName] = useState('')
  const [editBrandName, setEditBrandName] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState<'all' | 'customer' | 'supplier'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'category1' | 'category2'>('all')
  
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTags()
    fetchShelves()
    fetchBrands()
  }, [])

  const fetchShelves = async () => {
    try {
      const res = await fetch('/api/shelf-locations')
      const data = await res.json()
      setShelves(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error('Raf yerleri yüklenemedi')
    } finally {
      setShelvesLoading(false)
    }
  }

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newShelfName.trim()
    if (!name) return
    setShelfSaving(true)
    try {
      const res = await fetch('/api/shelf-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kayıt başarısız')
      setShelves((prev) => {
        const exists = prev.some((s) => s.id === data.id)
        if (exists) return prev.map((s) => (s.id === data.id ? data : s))
        return [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      })
      setNewShelfName('')
      toast.success('Raf yeri eklendi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setShelfSaving(false)
    }
  }

  const handleDeleteShelf = async (id: string) => {
    if (!confirm('Bu raf yerini silmek istediğinize emin misiniz? Ürünlerde kullanılıyorsa bağlantı kaldırılır.')) return
    try {
      const res = await fetch(`/api/shelf-locations/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Silinemedi')
      }
      setShelves((s) => s.filter((x) => x.id !== id))
      toast.success('Raf yeri silindi')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpdateShelf = async () => {
    if (!editingShelf || !editShelfName.trim()) return
    setShelfSaving(true)
    try {
      const res = await fetch(`/api/shelf-locations/${editingShelf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editShelfName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      setShelves((prev) => prev.map((s) => (s.id === data.id ? data : s)))
      setEditingShelf(null)
      toast.success('Raf yeri güncellendi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setShelfSaving(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/brands')
      const data = await res.json()
      setBrands(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error('Markalar yüklenemedi')
    } finally {
      setBrandsLoading(false)
    }
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBrandName.trim()
    if (!name) return
    setBrandSaving(true)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kayıt başarısız')
      setBrands((prev) => {
        const exists = prev.some((b) => b.id === data.id)
        if (exists) return prev.map((b) => (b.id === data.id ? data : b))
        return [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      })
      setNewBrandName('')
      toast.success('Marka eklendi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBrandSaving(false)
    }
  }

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('Bu markayı silmek istediğinize emin misiniz? Bu markayı kullanan ürünlerdeki marka alanı da temizlenir.')) return
    try {
      const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Silinemedi')
      }
      setBrands((prev) => prev.filter((x) => x.id !== id))
      toast.success('Marka silindi')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpdateBrand = async () => {
    if (!editingBrand || !editBrandName.trim()) return
    setBrandSaving(true)
    try {
      const res = await fetch(`/api/brands/${editingBrand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editBrandName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi')
      setBrands((prev) => prev.map((b) => (b.id === data.id ? data : b)))
      setEditingBrand(null)
      toast.success('Marka güncellendi')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBrandSaving(false)
    }
  }

  const fetchTags = async () => {
    try {
      const resCustomer = await fetch('/api/customer-tags?entityType=customer')
      const resSupplier = await fetch('/api/customer-tags?entityType=supplier')
      
      const dataCust = await resCustomer.json()
      const dataSupp = await resSupplier.json()
      
      setTags([...(Array.isArray(dataCust) ? dataCust : []), ...(Array.isArray(dataSupp) ? dataSupp : [])])
    } catch (error) {
      console.error('Error fetching tags:', error)
      toast.error('Tanımlar yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tanımı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/customer-tags/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTags(tags.filter(t => t.id !== id))
        toast.success('Tanım başarıyla silindi')
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Silme işlemi başarısız')
      }
    } catch (error: any) {
      console.error('Error deleting tag:', error)
      toast.error('Hata: ' + error.message)
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setNewName(tag.name)
  }

  const handleUpdate = async () => {
    if (!editingTag || !newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/customer-tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (res.ok) {
        const updated = await res.json()
        setTags(tags.map(t => t.id === updated.id ? updated : t))
        setEditingTag(null)
        toast.success('Tanım başarıyla güncellendi')
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Güncelleme işlemi başarısız')
      }
    } catch (error: any) {
      console.error('Error updating tag:', error)
      toast.error('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEntity = entityFilter === 'all' || tag.entity_type === entityFilter
    const matchesType = typeFilter === 'all' || tag.type === typeFilter
    return matchesSearch && matchesEntity && matchesType
  })

  const getTypeName = (type: string, entity: string) => {
    if (entity === 'customer') {
      return type === 'category1' ? 'Müşteri Grubu' : 'Müşteri Etiketi'
    } else {
      return type === 'category1' ? 'Tedarikçi Grubu' : 'Tedarikçi Etiketi'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tanımlar</h1>
        <p className="mt-2 text-gray-600">Müşteri ve tedarikçi gruplarını, etiketlerini, markaları ve depo içi raf yerlerini yönetin</p>
      </div>

      <div id="raf-yerleri" className="scroll-mt-24">
      <Card className="border-primary-100/80 bg-[#FAFAF7]/80">
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-200">
                <LayoutGrid className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Raf yerleri</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Depo içinde ürünün bulunduğu özel konumu (ör. A-12, Soğuk oda raf 3) tanımlayın. Ürün kartlarında seçilebilir.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateShelf} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Yeni raf yeri adı (örn. A koridor - raf 04)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm"
            />
            <Button type="submit" disabled={shelfSaving || !newShelfName.trim()} className="sm:w-auto shrink-0">
              {shelfSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" />Raf ekle</>}
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Raf adı</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shelvesLoading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td>
                  </tr>
                ) : shelves.length > 0 ? (
                  shelves.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        {editingShelf?.id === s.id ? (
                          <input
                            type="text"
                            value={editShelfName}
                            onChange={(e) => setEditShelfName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-primary-400 rounded-lg text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateShelf()
                              if (e.key === 'Escape') setEditingShelf(null)
                            }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {editingShelf?.id === s.id ? (
                          <>
                            <Button size="sm" onClick={handleUpdateShelf} disabled={shelfSaving}>
                              Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingShelf(null)}>
                              Vazgeç
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingShelf(s)
                                setEditShelfName(s.name)
                              }}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShelf(s.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500 italic">
                      Henüz raf yeri tanımlanmamış. Yukarıdan ekleyebilirsiniz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      </div>

      <div id="markalar" className="scroll-mt-24">
      <Card className="border-primary-100/80 bg-[#FAFAF7]/80">
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-200">
                <TagIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Markalar</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Ürün kartlarında seçilebilecek marka tanımlarını yönetin.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateBrand} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Yeni marka adı"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm"
            />
            <Button type="submit" disabled={brandSaving || !newBrandName.trim()} className="sm:w-auto shrink-0">
              {brandSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" />Marka ekle</>}
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Marka adı</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brandsLoading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td>
                  </tr>
                ) : brands.length > 0 ? (
                  brands.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        {editingBrand?.id === b.id ? (
                          <input
                            type="text"
                            value={editBrandName}
                            onChange={(e) => setEditBrandName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-primary-400 rounded-lg text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateBrand()
                              if (e.key === 'Escape') setEditingBrand(null)
                            }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{b.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {editingBrand?.id === b.id ? (
                          <>
                            <Button size="sm" onClick={handleUpdateBrand} disabled={brandSaving}>
                              Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingBrand(null)}>
                              Vazgeç
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBrand(b)
                                setEditBrandName(b.name)
                              }}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBrand(b.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500 italic">
                      Henüz marka tanımlanmamış. Yukarıdan ekleyebilirsiniz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tanım ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">Tüm Kaynaklar</option>
              <option value="customer">Müşteriler</option>
              <option value="supplier">Tedarikçiler</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">Tüm Türler</option>
              <option value="category1">Gruplar</option>
              <option value="category2">Özel Etiketler</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanım Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaynak</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                  </tr>
                ) : filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {editingTag?.id === tag.id ? (
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-2 py-1 border border-primary-500 rounded outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdate()
                              if (e.key === 'Escape') setEditingTag(null)
                            }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {tag.entity_type === 'customer' ? <Users className="h-3 w-3 mr-1" /> : <Warehouse className="h-3 w-3 mr-1" />}
                          {tag.entity_type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {getTypeName(tag.type, tag.entity_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {editingTag?.id === tag.id ? (
                          <>
                            <Button size="sm" onClick={handleUpdate} disabled={saving}>
                              Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTag(null)}>
                              Vazgeç
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(tag)}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                      Henüz bir tanım bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
