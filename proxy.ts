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

  // Modo manutenção: logado navega em tudo. Visitante só vê a home
  // (tela de manutenção) e as rotas de login — que não têm link em lugar nenhum.
  if (user) {
    return supabaseResponse
  }

  const openPaths = [
    '/',
    '/login',
    '/esqueci-senha',
    '/resetar-senha',
    '/auth',
    '/api/email',
    '/api/auth',
    '/api/activity',
  ]
  const isOpen = openPaths.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)))

  if (!isOpen) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Site em manutenção' }, { status: 503 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Webhooks não usam sessão — ficam fora do proxy
    '/((?!_next/static|_next/image|api/webhooks|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
