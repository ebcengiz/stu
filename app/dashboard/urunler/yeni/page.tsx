'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ImageIcon, X, UploadCloud, Loader2, Package, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    unit: 'adet',
    min_stock_level: 0,
    image_url: '',
    category_id: '',
  })

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(Array.isArray(data) ? data : [])
        setLoadingCategories(false)
      })
      .catch(err => {
        console.error('Error fetching categories:', err)
        setLoadingCategories(false)
      })
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit check
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır.')
      return
    }

    setUploading(true)
    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')

      setFormData(prev => ({ ...prev, image_url: data.url }))
      toast.success('Görsel başarıyla yüklendi')
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
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ürün eklenemedi')
      }

      toast.success('Ürün başarıyla oluşturuldu')
      router.push('/dashboard/urunler')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/urunler">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-black">Yeni Ürün</h1>
          <p className="mt-1 text-gray-500 font-medium">Yeni bir ürün ekleyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Form Details */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-xl shadow-gray-100/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-6 px-8">
              <CardTitle className="text-lg font-black text-gray-800 uppercase tracking-widest flex items-center gap-3">
                <Package className="h-5 w-5 text-primary-500" />
                Ürün Temel Bilgileri
              </CardTitle>
            </CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-pulse border border-red-100">
                    <X className="h-5 w-5" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Ürün Adı *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                      placeholder="Ürün adını giriniz"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">SKU (Stok Kodu)</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300 uppercase"
                      placeholder="Örn: ABC-123"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Barkod No</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                      placeholder="Barkod numarasını giriniz"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Kategori *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full px-5 pr-12 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none text-[13px] font-semibold text-gray-700 transition-all bg-white appearance-none truncate shadow-sm"
                      >
                        <option value="">Kategori Seçiniz</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Birim Türü *</label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all bg-white"
                    >
                      <option value="adet">Adet</option>
                      <option value="kg">Kg</option>
                      <option value="litre">Litre</option>
                      <option value="metre">Metre</option>
                      <option value="paket">Paket</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Minimum Stok Seviyesi</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stock_level}
                        onFocus={() => formData.min_stock_level === 0 && setFormData({...formData, min_stock_level: '' as any})}
                        onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                        className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Ürün Açıklaması</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none font-bold text-gray-900 transition-all placeholder:text-gray-300"
                    placeholder="Ürün hakkında detaylı bilgi giriniz..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                  <Link href="/dashboard/urunler">
                    <Button type="button" variant="outline" className="h-14 px-8 rounded-2xl font-bold text-gray-500 border-2">
                      İptal
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl font-black text-lg shadow-lg shadow-primary-100">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      'Ürünü Kaydet'
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right Side: Image Upload */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-xl shadow-gray-100/50 rounded-3xl overflow-hidden sticky top-24">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-6 px-8">
              <CardTitle className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-primary-500" />
                Ürün Görseli
              </CardTitle>
            </CardHeader>
            <CardBody className="p-8">
              <div className="space-y-6">
                {formData.image_url ? (
                  <div className="relative group rounded-3xl overflow-hidden border-4 border-gray-50 aspect-square shadow-inner">
                    <img 
                      src={formData.image_url} 
                      alt="Ürün önizleme" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button" 
                        onClick={removeImage}
                        className="bg-white/20 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/40 transition-all active:scale-90"
                      >
                        <X className="h-8 w-8" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="image-upload"
                      className={`
                        flex flex-col items-center justify-center aspect-square border-4 border-dashed border-gray-100 rounded-3xl cursor-pointer 
                        hover:border-primary-200 hover:bg-primary-50/30 transition-all group p-10 text-center
                        ${uploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                      `}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-12 w-12 text-primary-500 animate-spin" />
                          <p className="text-sm font-black text-primary-600 uppercase tracking-wider">Yükleniyor...</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-6 bg-primary-50 rounded-3xl mb-4 group-hover:scale-110 group-hover:bg-primary-100 transition-all">
                            <UploadCloud className="h-10 w-10 text-primary-500" />
                          </div>
                          <p className="font-black text-gray-800 uppercase text-xs tracking-widest mb-1">Görsel Seç</p>
                          <p className="text-gray-400 text-[10px] font-bold">PNG, JPG veya WEBP (Max 5MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
                
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] leading-relaxed text-amber-800 font-bold uppercase tracking-tight">
                    * Profesyonel bir görünüm için beyaz arka planlı görseller tercih etmeniz önerilir.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
