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
  Users,
  ChevronDown,
  Tags,
  ShoppingCart,
  FileText,
  DollarSign,
  Wallet,
  Briefcase,
  Receipt,
  Banknote,
  Armchair,
  FolderKanban,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'

interface Profile {
  full_name: string
  role: string
  tenants: {
    name: string
  }
}

type SidebarNavItem = { name: string; href: string; icon: LucideIcon }

type SidebarContentProps = {
  isMobile?: boolean
  isCollapsed: boolean
  setIsCollapsed: Dispatch<SetStateAction<boolean>>
  navigation: SidebarNavItem[]
  pathname: string
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  isCashManagementOpen: boolean
  setIsCashManagementOpen: Dispatch<SetStateAction<boolean>>
  isSettingsOpen: boolean
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>
  profile: Profile | null
  handleSignOut: () => void | Promise<void>
}

function SidebarContent({
  isMobile = false,
  isCollapsed,
  setIsCollapsed,
  navigation,
  pathname,
  setIsMobileMenuOpen,
  isCashManagementOpen,
  setIsCashManagementOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  profile,
  handleSignOut,
}: SidebarContentProps) {
  const collapsed = !isMobile && isCollapsed

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className={`h-16 flex items-center border-b border-gray-200 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-6 justify-between'}`}>
        <Link href="/dashboard" className="flex items-center">
          <span className={`font-bold text-primary-600 transition-all duration-300 ${collapsed ? 'text-xl' : 'text-2xl'}`}>
            {collapsed ? 'MM' : 'Mikro Muhasebe'}
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
        {navigation.slice(0, 7).map((item) => {
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

        <div className="space-y-1">
          <button
            onClick={() => {
              if (collapsed) {
                setIsCollapsed(false)
                setIsCashManagementOpen(true)
              } else {
                setIsCashManagementOpen(!isCashManagementOpen)
              }
            }}
            className={`w-full flex items-center py-2.5 text-sm font-medium rounded-md transition-all duration-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
            title={collapsed ? 'Nakit Yönetimi' : undefined}
          >
            <DollarSign className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-gray-700">Nakit Yönetimi</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCashManagementOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {isCashManagementOpen && !collapsed && (
            <div className="ml-9 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <Link
                href="/dashboard/hesaplarim"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith('/dashboard/hesaplarim') &&
                  !pathname.startsWith('/dashboard/hesaplarim/calisanlar') &&
                  !pathname.startsWith('/dashboard/hesaplarim/masraflar') &&
                  !pathname.startsWith('/dashboard/hesaplarim/krediler') &&
                  !pathname.startsWith('/dashboard/hesaplarim/demirbaslar') &&
                  !pathname.startsWith('/dashboard/hesaplarim/projeler') &&
                  !pathname.startsWith('/dashboard/hesaplarim/cek-portfoyu')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Hesaplarım
              </Link>
              <Link
                href="/dashboard/hesaplarim/calisanlar"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/calisanlar' || pathname.startsWith('/dashboard/hesaplarim/calisanlar/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Çalışanlar
              </Link>
              <Link
                href="/dashboard/hesaplarim/masraflar"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/masraflar' ||
                  pathname.startsWith('/dashboard/hesaplarim/masraflar/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Masraflar
              </Link>
              <Link
                href="/dashboard/hesaplarim/krediler"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/krediler' ||
                  pathname.startsWith('/dashboard/hesaplarim/krediler/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Krediler
              </Link>
              <Link
                href="/dashboard/hesaplarim/demirbaslar"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/demirbaslar' ||
                  pathname.startsWith('/dashboard/hesaplarim/demirbaslar/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Armchair className="h-4 w-4 mr-2" />
                Demirbaşlar
              </Link>
              <Link
                href="/dashboard/hesaplarim/projeler"
                className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/projeler' ||
                  pathname.startsWith('/dashboard/hesaplarim/projeler/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } px-3`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                Projeler
              </Link>
              <Link
                href="/dashboard/hesaplarim/cek-portfoyu"
                className={`ml-3 flex items-center border-l-2 border-primary-200 pl-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/hesaplarim/cek-portfoyu'
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <ScrollText className="h-4 w-4 mr-2 shrink-0" />
                Çek Portföyü
              </Link>
            </div>
          )}
        </div>

        {navigation.slice(7).map((item) => {
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

        {profile?.role === 'admin' && (
          <div className="space-y-1">
            <button
              onClick={() => {
                if (collapsed) {
                  setIsCollapsed(false)
                  setIsSettingsOpen(true)
                } else {
                  setIsSettingsOpen(!isSettingsOpen)
                }
              }}
              className={`w-full flex items-center py-2.5 text-sm font-medium rounded-md transition-all duration-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
              title={collapsed ? 'Ayarlar' : undefined}
            >
              <Settings className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-gray-700">Ayarlar</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {isSettingsOpen && !collapsed && (
              <div className="ml-9 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <Link
                  href="/dashboard/ayarlar"
                  className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/dashboard/ayarlar' ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } px-3`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Genel Ayarlar
                </Link>
                <Link
                  href="/dashboard/tanimlar"
                  className={`flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === '/dashboard/tanimlar' ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } px-3`}
                >
                  <Tags className="h-4 w-4 mr-2" />
                  Tanımlar
                </Link>
              </div>
            )}
          </div>
        )}
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

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCashManagementOpen, setIsCashManagementOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true)
      const savedState = localStorage.getItem('sidebarCollapsed')
      if (savedState !== null) {
        setIsCollapsed(savedState === 'true')
      }

      if (pathname.includes('/dashboard/ayarlar') || pathname.includes('/dashboard/tanimlar')) {
        setIsSettingsOpen(true)
      }
      if (pathname.includes('/dashboard/hesaplarim')) {
        setIsCashManagementOpen(true)
      }
    })
  }, [pathname])

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed))
      window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: isCollapsed }))
    }
  }, [isCollapsed, isMounted])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navigation: SidebarNavItem[] = [
    { name: 'Ana sayfa', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Müşteriler', href: '/dashboard/musteriler', icon: Users },
    { name: 'Tedarikçiler', href: '/dashboard/tedarikciler', icon: Warehouse },
    { name: 'Ürünler', href: '/dashboard/urunler', icon: Package },
    { name: 'Satışlar', href: '/dashboard/satislar', icon: ArrowLeftRight },
    { name: 'Alışlar', href: '/dashboard/alislar', icon: ShoppingCart },
    { name: 'Teklifler', href: '/dashboard/teklifler', icon: FileText },
    { name: 'Kategoriler', href: '/dashboard/kategoriler', icon: FolderTree },
    { name: 'Depolar', href: '/dashboard/depolar', icon: Warehouse },
    { name: 'Raporlar', href: '/dashboard/raporlar', icon: BarChart3 },
    { name: 'Stok Hareketleri', href: '/dashboard/stok-hareketleri', icon: ArrowLeftRight },
  ]

  const sidebarProps: Omit<SidebarContentProps, 'isMobile'> = {
    isCollapsed,
    setIsCollapsed,
    navigation,
    pathname,
    setIsMobileMenuOpen,
    isCashManagementOpen,
    setIsCashManagementOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    profile,
    handleSignOut,
  }

  const sidebarWidthClass = isMounted && isCollapsed ? 'lg:w-20' : 'lg:w-64'

  return (
    <>
      <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 sticky top-0 z-20">
        <Link href="/dashboard" className="text-xl font-bold text-primary-600">
          Mikro Muhasebe
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-md"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`
        lg:hidden fixed inset-y-0 left-0 flex flex-col w-64 bg-white transform transition-transform duration-300 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent {...sidebarProps} isMobile />
      </div>

      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-20 transition-all duration-300 ${sidebarWidthClass}`}>
        <SidebarContent {...sidebarProps} />
      </div>
    </>
  )
}
