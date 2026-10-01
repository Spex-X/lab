'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { suggestEmailCorrection } from '@/lib/email-suggest'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { AuthShell, authInput, authButton } from '@/components/auth-shell'

function getRefCookie() {
  const match = document.cookie.match(/(?:^|;\s*)rifa_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(() => searchParams.has('cadastro'))
  const [showPassword, setShowPassword] = useState(false)
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [emailAcknowledged, setEmailAcknowledged] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        if (emailSuggestion && !emailAcknowledged) {
          setEmailAcknowledged(true)
          setError(`Confira seu email — você quis dizer ${emailSuggestion}?`)
          return
        }
        const check = await fetch('/api/email/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
          .then((r) => r.json())
          .catch(() => ({ ok: true }))
        if (!check.ok) {
          setError(check.error || 'Email inválido — confira o endereço')
          return
        }
        const refCode = getRefCookie()
        const { data, error } = await supabase.auth.signUp({
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
        if (data.session) {
          // Confirmação de email desativada — já entra logado no dashboard
          fetch('/api/email/welcome', { method: 'POST' }).catch(() => {})
          router.push(searchParams.get('next') || '/dashboard')
          router.refresh()
        } else {
          setSuccess('Cadastro realizado! Verifique seu email para confirmar.')
          setIsSignUp(false)
        }
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
        // Redireciona pro destino original ou pro dashboard
        const dest = searchParams.get('next') || '/dashboard'
        router.push(dest)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
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
          {isSignUp ? 'Preencha os dados para criar sua conta' : 'Entre para participar dos jogos'}
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
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailSuggestion(suggestEmailCorrection(e.target.value))
              setEmailAcknowledged(false)
            }}
            className={authInput}
            placeholder="seu@email.com"
            required
          />
          {isSignUp && emailSuggestion && (
            <button
              type="button"
              onClick={() => {
                setEmail(emailSuggestion)
                setEmailSuggestion(null)
                setEmailAcknowledged(false)
                setError('')
              }}
              className="mt-1.5 text-left text-xs text-primary font-medium hover:underline"
            >
              Você quis dizer <strong>{emailSuggestion}</strong>? Clique para corrigir.
            </button>
          )}
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
