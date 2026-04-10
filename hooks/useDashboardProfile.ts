'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type DashboardProfile = {
  full_name: string
  role: string
  tenants: { name: string }
}

export function useDashboardProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<DashboardProfile | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()

      setProfile(userProfile as DashboardProfile)
    }

    checkAuth()
  }, [router])

  return profile
}
