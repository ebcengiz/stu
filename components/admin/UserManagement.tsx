'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

export default function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'user'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kullanıcı eklenemedi')
      }

      setShowModal(false)
      setFormData({ fullName: '', email: '', password: '', role: 'user' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; class: string }> = {
      'admin': { label: 'Admin', class: 'bg-purple-100 text-purple-800' },
      'manager': { label: 'Yönetici', class: 'bg-primary-100 text-blue-800' },
      'user': { label: 'Kullanıcı', class: 'bg-gray-100 text-gray-800' }
    }
    return roles[role] || roles['user']
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4">
        <CardTitle>Kullanıcı Listesi</CardTitle>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialUsers && initialUsers.length > 0 ? (
                initialUsers.map((usr: any) => {
                  const roleBadge = getRoleBadge(usr.role)
                  return (
                    <tr key={usr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usr.full_name || 'İsimsiz Kullanıcı'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.class}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(usr.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    Henüz kullanıcı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Yeni Kullanıcı Ekle</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Kullanıcının tam adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="En az 6 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
