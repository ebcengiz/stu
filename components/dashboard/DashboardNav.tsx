'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  FolderTree,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  full_name: string
  role: string
  tenants: {
    name: string
  }
}

export default function DashboardNav({ profile }: { profile: Profile | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Ürünler', href: '/dashboard/urunler', icon: Package },
    { name: 'Stok Hareketleri', href: '/dashboard/stok-hareketleri', icon: ArrowLeftRight },
    { name: 'Kategoriler', href: '/dashboard/kategoriler', icon: FolderTree },
    { name: 'Depolar', href: '/dashboard/depolar', icon: Warehouse },
    { name: 'Raporlar', href: '/dashboard/raporlar', icon: BarChart3 },
  ]

  if (profile?.role === 'admin') {
    navigation.push({ name: 'Yönetim', href: '/dashboard/yonetim', icon: Settings })
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Hamburger Button for Mobile */}
            <div className="flex items-center sm:hidden mr-4">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
                aria-expanded="false"
              >
                <span className="sr-only">Menüyü aç</span>
                {isOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
            
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl sm:text-2xl font-bold text-primary-600">
                Stok Takip
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-xs sm:text-sm text-right">
              <div className="font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">{profile?.full_name}</div>
              <div className="text-gray-500 text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-none">{profile?.tenants?.name}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu (Hamburger Menu Content) */}
      <div className={`${isOpen ? 'block animate-in slide-in-from-top-4 duration-200' : 'hidden'} sm:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-40`}>
        <div className="px-3 pt-2 pb-6 space-y-1 bg-white">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)} // Menüye tıklandığında menüyü kapat
                className={`flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="mr-4 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
        {/* Overlay to close menu when clicking outside */}
        <div 
          className="fixed inset-0 bg-black/20 -z-10" 
          onClick={() => setIsOpen(false)}
        />
      </div>
    </nav>
  )
}
