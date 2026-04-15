'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Edit2, Trash2, Search, Users, Warehouse } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Tag {
  id: string
  name: string
  type: 'category1' | 'category2'
  entity_type: 'customer' | 'supplier'
}

export default function DefinitionsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState<'all' | 'customer' | 'supplier'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'category1' | 'category2'>('all')
  
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

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
        <p className="mt-2 text-gray-600">Müşteri ve tedarikçi gruplarını, etiketlerini yönetin</p>
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
