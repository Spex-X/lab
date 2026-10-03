import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Valida o JWT (local com chaves assimétricas) e renova o cookie se expirado
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? claimsData.claims : null

  const { pathname } = request.nextUrl

  // Site em construção: só o admin navega.
  // Deslogado vê só login/recuperação; logado sem ser admin cai na home ("em construção").
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.sub)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const openPaths = user
    ? ['/', '/logout', '/auth', '/api/email'] // logado não-admin: home + sair
    : ['/', '/login', '/esqueci-senha', '/resetar-senha', '/auth', '/api/email']

  if (!isAdmin) {
    const isOpen = openPaths.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)))
    if (!isOpen) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Site em manutenção' }, { status: 503 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Webhooks não usam sessão — ficam fora do proxy
    '/((?!_next/static|_next/image|api/webhooks|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
