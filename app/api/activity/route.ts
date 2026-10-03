import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Registra página visitada por usuário logado. Anônimo = no-op.
export async function POST(request: NextRequest) {
  const { path } = await request.json().catch(() => ({ path: null }))

  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('/api') || path.length > 200) {
    return new NextResponse(null, { status: 204 })
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return new NextResponse(null, { status: 204 })
  }

  await supabase.from('user_activity').insert({ user_id: userId, path })
  return new NextResponse(null, { status: 204 })
}
