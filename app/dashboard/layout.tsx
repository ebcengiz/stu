'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardProfile } from '@/hooks/useDashboardProfile'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = useDashboardProfile()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true')
    }

    const handleSidebarToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setIsSidebarCollapsed(customEvent.detail)
    }

    window.addEventListener('sidebarToggle', handleSidebarToggle)
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle)
  }, [])

  // Use a fallback margin to prevent flicker before mounting, matching the default uncollapsed state
  const marginClass = isMounted && isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <DashboardSidebar profile={profile} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${marginClass}`}>
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
