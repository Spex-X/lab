import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar email={user.email ?? ''} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
