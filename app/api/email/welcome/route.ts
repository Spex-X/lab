import { createClient } from '@/lib/supabase-server'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

// Boas-vindas após cadastro — só envia para o próprio usuário autenticado
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const result = await sendWelcomeEmail(user.email, profile?.full_name)
  return NextResponse.json({ sent: result.ok, error: result.error })
}
