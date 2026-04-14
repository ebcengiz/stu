import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHomeView from '@/components/dashboard/DashboardHomeView'
import { loadDashboardHomeData } from '@/lib/dashboard-home-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const data = await loadDashboardHomeData(supabase)

  return <DashboardHomeView data={data} />
}
