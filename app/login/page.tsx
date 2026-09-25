'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { AuthShell, authInput, authButton } from '@/components/auth-shell'

function getRefCookie() {
  const match = document.cookie.match(/(?:^|;\s*)rifa_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        const refCode = getRefCookie()
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              ...(refCode ? { referred_by_code: refCode } : {}),
            },
          },
        })
        if (error) throw error
        setSuccess('Cadastro realizado! Verifique seu email para confirmar.')
        setIsSignUp(false)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) {
          try {
            await supabase.rpc('ensure_affiliate_code', {
              p_user_id: data.user.id,
              p_ref_code: getRefCookie(),
            })
          } catch {
            // Vinculação de parceiro não pode bloquear o login
          }
        }
        // Redireciona conforme o tipo de usuário (respeita ?next=)
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, is_affiliate')
          .eq('id', data.user!.id)
          .single()
        const dest =
          searchParams.get('next') ||
          (prof?.role === 'admin' || prof?.is_affiliate ? '/dashboard' : '/rifas')
        router.push(dest)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
        </h1>
        <p className="text-muted-foreground">
          {isSignUp ? 'Preencha os dados para criar sua conta' : 'Entre para participar das rifas'}
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium mb-2">Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={authInput}
              placeholder="Seu nome"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Senha</label>
            {!isSignUp && (
              <Link href="/esqueci-senha" className="text-xs text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInput} pr-12`}
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {isSignUp && <p className="text-xs text-muted-foreground mt-1.5">Mínimo 6 caracteres</p>}
        </div>

        <button type="submit" disabled={loading} className={authButton}>
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processando...
            </>
          ) : isSignUp ? (
            'Criar conta'
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-background text-muted-foreground">ou continue com</span>
        </div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3 rounded-xl border border-border bg-card font-medium hover:bg-muted transition flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
            setSuccess('')
          }}
          className="text-primary font-medium hover:underline"
        >
          {isSignUp ? 'Faça login' : 'Cadastre-se'}
        </button>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
