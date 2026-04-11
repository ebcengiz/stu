'use client'

import { createClient } from '@/lib/supabase/client'
import { redirect, useRouter } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()
      
      setProfile(userProfile)
    }
    
    checkAuth()

    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true')
    }

    const handleSidebarToggle = (e: Event) => {
      const customEvent = e as CustomEvent
      setIsSidebarCollapsed(customEvent.detail)
    }

    window.addEventListener('sidebarToggle', handleSidebarToggle)
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle)
  }, [router])

  // Use a fallback margin to prevent flicker before mounting, matching the default uncollapsed state
  const marginClass = isMounted && isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gray-50 lg:flex-row">
      <DashboardSidebar profile={profile} />
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden transition-all duration-300 ${marginClass}`}
      >
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
