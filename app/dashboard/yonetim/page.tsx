import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { Users, Building, Settings as SettingsIcon, Package, Warehouse, ArrowLeftRight } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get users
  const { data: users, count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('tenant_id', profile.tenant_id)

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  // Get system stats
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  const { count: warehousesCount } = await supabase
    .from('warehouses')
    .select('*', { count: 'exact', head: true })

  const { count: movementsCount } = await supabase
    .from('stock_movements')
    .select('*', { count: 'exact', head: true })

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; class: string }> = {
      'admin': { label: 'Admin', class: 'bg-purple-100 text-purple-800' },
      'manager': { label: 'Yönetici', class: 'bg-blue-100 text-blue-800' },
      'user': { label: 'Kullanıcı', class: 'bg-gray-100 text-gray-800' }
    }
    return roles[role] || roles['user']
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yönetim Paneli</h1>
        <p className="mt-2 text-gray-600">Sistem ayarları ve kullanıcı yönetimi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Kullanıcılar</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {userCount || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Toplam kullanıcı</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Firma</h3>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {tenant?.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {tenant?.is_active ? 'Aktif' : 'Pasif'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <SettingsIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Sistem</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Versiyon: 1.0.0
                </p>
                <p className="text-sm text-gray-500">
                  Durum: Aktif
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Sistem İstatistikleri</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Ürün</p>
                <p className="text-xl font-bold text-gray-900">{productsCount || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <Warehouse className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Depo</p>
                <p className="text-xl font-bold text-gray-900">{warehousesCount || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded">
                <ArrowLeftRight className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Hareket</p>
                <p className="text-xl font-bold text-gray-900">{movementsCount || 0}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tenant Info */}
      <Card>
        <CardHeader>
          <CardTitle>Firma Bilgileri</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-500">Firma Adı:</span>
              <span className="text-sm text-gray-900">{tenant?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-500">Slug:</span>
              <span className="text-sm text-gray-900">{tenant?.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-500">Oluşturulma Tarihi:</span>
              <span className="text-sm text-gray-900">
                {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('tr-TR') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-gray-500">Durum:</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                tenant?.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {tenant?.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Listesi</CardTitle>
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
                {users && users.length > 0 ? (
                  users.map((usr: any) => {
                    const roleBadge = getRoleBadge(usr.role)
                    return (
                      <tr key={usr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {usr.full_name || 'İsimsiz Kullanıcı'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleBadge.class}`}>
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
      </Card>
    </div>
  )
}
