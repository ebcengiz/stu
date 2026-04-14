'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Users, Phone, Mail, Building2, User, FileBarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import { hasTerminationDate } from '@/lib/employeeStatus'

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  department: string | null
  currency: string
  photo_url: string | null
  leave_date?: string | null
  cari_balance?: number
}

function formatCariBalance(n: number | undefined, currency: string) {
  const v = Number(n ?? 0)
  const s = Math.abs(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  if (currency === 'USD') return `${v < 0 ? '-' : ''}$${s}`
  if (currency === 'EUR') return `${v < 0 ? '-' : ''}€${s}`
  return `${v < 0 ? '-' : ''}${s} ₺`
}

function EmployeeAvatar({ name, photoUrl }: { name: string; photoUrl: string | null | undefined }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?'
  if (photoUrl) {
    return (
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white shadow-sm">
        <Image
          src={photoUrl}
          alt={name}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800 ring-2 ring-white shadow-sm"
      aria-hidden
    >
      {initial}
    </div>
  )
}

export default function CalisanlarPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' })
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

  if (loading) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-full justify-center overflow-x-hidden py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            Çalışanlar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Nakit Yönetimi · Personel kayıtları</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/hesaplarim/calisanlar/rapor">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-primary-200 bg-white text-primary-700 hover:bg-primary-50"
            >
              <FileBarChart2 className="h-4 w-4" />
              Rapor
            </Button>
          </Link>
          <Link href="/dashboard/hesaplarim/calisanlar/yeni">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Yeni çalışan
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Çalışan
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
                    Cari
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-10 w-10 text-gray-500" />
                        <span>Henüz çalışan kaydı yok. Yeni çalışan ekleyin.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50/80 cursor-pointer ${
                        hasTerminationDate(r.leave_date) ? 'text-gray-400' : ''
                      }`}
                      onClick={() => router.push(`/dashboard/hesaplarim/calisanlar/${r.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <EmployeeAvatar name={r.name} photoUrl={r.photo_url} />
                          <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                        </div>
                      </td>
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
                      <td
                        className={`px-6 py-4 text-right text-sm font-bold whitespace-nowrap ${
                          hasTerminationDate(r.leave_date)
                            ? 'text-gray-400'
                            : (r.cari_balance ?? 0) >= 0
                              ? 'text-emerald-700'
                              : 'text-red-700'
                        }`}
                      >
                        {formatCariBalance(r.cari_balance, r.currency || 'TRY')}
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
