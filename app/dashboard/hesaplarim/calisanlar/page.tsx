'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Users, Phone, Mail, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  department: string | null
  currency: string
}

export default function CalisanlarPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Liste alınamadı')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Çalışanlar yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" silinsin mi?`)) return
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Silinemedi')
      toast.success('Silindi')
      load()
      router.refresh()
    } catch {
      toast.error('Silinemedi')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-10 w-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            Çalışanlar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Nakit Yönetimi · Personel kayıtları</p>
        </div>
        <Link href="/dashboard/hesaplarim/calisanlar/yeni">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Yeni çalışan
          </Button>
        </Link>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    İsim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Departman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      Henüz çalışan kaydı yok. Yeni çalışan ekleyin.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80">
                      <td className="px-6 py-4 font-semibold text-gray-900">{r.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.department ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            {r.department}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {r.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {r.email}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/dashboard/hesaplarim/calisanlar/${r.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 mr-1"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.name)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
