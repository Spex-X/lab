'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { suggestEmailCorrection } from '@/lib/email-suggest'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, authInput, authButton } from '@/components/auth-shell'

function getRefCookie() {
  const match = document.cookie.match(/(?:^|;\s*)rifa_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function AffiliateSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [emailAcknowledged, setEmailAcknowledged] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
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
            wants_affiliate: true,
            ...(refCode ? { referred_by_code: refCode } : {}),
          },
        },
      })
      if (error) throw error
      if (data.session) {
        // Confirmação de email desativada — garante vínculo e entra no dashboard
        try {
          await supabase.rpc('ensure_affiliate_code', {
            p_user_id: data.user!.id,
            p_ref_code: refCode,
            p_wants_affiliate: true,
          })
        } catch {
          // Não bloqueia o acesso
        }
        fetch('/api/email/welcome', { method: 'POST' }).catch(() => {})
        router.push('/dashboard')
        router.refresh()
      } else {
        setDone(true)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {done ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl mx-auto mb-6">
            ✓
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Cadastro recebido!</h1>
          <p className="text-muted-foreground mb-8">
            Sua conta de parceiro foi criada! Faça login para acessar seu painel,
            pegar seus links de divulgação e começar a ganhar comissões.
          </p>
          <Link href="/login" className={authButton}>
            Ir para o login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold mb-4">
              Sistema parceria
            </span>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Cadastro de parceiro</h1>
            <p className="text-muted-foreground">
              Cadastro exclusivo para parceiros convidados. Ganhe 20% nas vendas diretas
              + 5% em cada venda da sua rede.
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
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
              {emailSuggestion && (
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
              <label className="block text-sm font-medium mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authInput}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1.5">Mínimo 6 caracteres</p>
            </div>

            <button type="submit" disabled={loading} className={authButton}>
              {loading ? 'Cadastrando...' : 'Cadastrar como parceiro'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
