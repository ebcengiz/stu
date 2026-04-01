'use client'

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
  X,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface Profile {
  full_name: string
  role: string
  tenants: {
    name: string
  }
}

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true')
    }
  }, [])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed))
      // Dispatch a custom event so the layout can listen to it and adjust the margin
      window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: isCollapsed }))
    }
  }, [isCollapsed, isMounted])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navigation = [
    { name: 'Anasayfa', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Ürünler', href: '/dashboard/urunler', icon: Package },
    { name: 'Kategoriler', href: '/dashboard/kategoriler', icon: FolderTree },
    { name: 'Depolar', href: '/dashboard/depolar', icon: Warehouse },
    { name: 'Müşteriler', href: '/dashboard/musteriler', icon: Users },
    { name: 'Tedarikçiler', href: '/dashboard/tedarikciler', icon: Warehouse },
    { name: 'Raporlar', href: '/dashboard/raporlar', icon: BarChart3 },
    { name: 'Stok Hareketleri', href: '/dashboard/stok-hareketleri', icon: ArrowLeftRight },
  ]

  if (profile?.role === 'admin') {
    navigation.push({ name: 'Ayarlar', href: '/dashboard/ayarlar', icon: Settings })
  }

  const SidebarContent = ({ isMobile = false }) => {
    const collapsed = !isMobile && isCollapsed;
    
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className={`h-16 flex items-center border-b border-gray-200 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-6 justify-between'}`}>
          <Link href="/dashboard" className="flex items-center">
            <span className={`font-bold text-primary-600 transition-all duration-300 ${collapsed ? 'text-xl' : 'text-2xl'}`}>
              {collapsed ? 'ST' : 'Stok Takip'}
            </span>
          </Link>
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${collapsed ? 'hidden' : 'block'}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* When collapsed, show the expand button right below the logo area if it was hidden */}
        {!isMobile && collapsed && (
           <div className="flex justify-center pt-4">
             <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="Genişlet"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
           </div>
        )}

        <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center py-2.5 text-sm font-medium rounded-md transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-3' : 'justify-between'}`}>
            {!collapsed && (
              <div className="text-sm truncate mr-2">
                <div className="font-medium text-gray-900 truncate" title={profile?.full_name}>{profile?.full_name}</div>
                <div className="text-gray-500 text-xs truncate" title={profile?.tenants?.name}>{profile?.tenants?.name}</div>
              </div>
            )}
            {collapsed && (
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs" title={profile?.full_name}>
                {profile?.full_name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors flex-shrink-0 ${collapsed ? 'mt-2' : ''}`}
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Prevent hydration mismatch by not rendering collapsed state differently on first render
  const sidebarWidthClass = isMounted && isCollapsed ? 'lg:w-20' : 'lg:w-64'

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 sticky top-0 z-20">
        <Link href="/dashboard" className="text-xl font-bold text-primary-600">
          Stok Takip
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-md"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 flex flex-col w-64 bg-white transform transition-transform duration-300 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent isMobile={true} />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-20 transition-all duration-300 ${sidebarWidthClass}`}>
        <SidebarContent />
      </div>
    </>
  )
}
