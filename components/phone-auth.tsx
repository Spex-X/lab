'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { authInput, authButton } from '@/components/auth-shell'
import { getRefCookie } from '@/lib/ref-cookie'
import { maskPhoneBR, toE164BR } from '@/lib/phone'

const RESEND_SECONDS = 60

// Entrar / cadastrar com código por SMS (Supabase Phone Auth).
// Cadastro: nome + telefone. Login: só telefone.
export function PhoneAuth({ isSignUp, next }: { isSignUp: boolean; next: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const friendly = (msg: string) => {
    const m = msg.toLowerCase()
    if (m.includes('signups not allowed') || m.includes('user not found'))
      return 'Nenhuma conta com esse telefone. Toque em "Cadastre-se" para criar.'
    if (m.includes('expired') || m.includes('invalid')) return 'Código inválido ou expirado. Confira ou peça outro.'
    if (m.includes('rate') || m.includes('security purposes')) return 'Aguarde um pouco antes de pedir outro código.'
    if (m.includes('phone') && m.includes('provider')) return 'Login por telefone indisponível no momento.'
    return msg
  }

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    const e164 = toE164BR(phone)
    if (!e164) {
      setError('Telefone inválido. Use DDD + número, ex: (11) 98765-4321')
      return
    }
    if (isSignUp && !fullName.trim()) {
      setError('Informe seu nome')
      return
    }

    setLoading(true)
    const refCode = getRefCookie()
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: {
        shouldCreateUser: isSignUp,
        ...(isSignUp && {
          data: {
            full_name: fullName.trim(),
            wants_affiliate: true,
            ...(refCode ? { referred_by_code: refCode } : {}),
          },
        }),
      },
    })
    setLoading(false)

    if (error) {
      setError(friendly(error.message))
      return
    }
    setSentTo(e164)
    setCode('')
    setCooldown(RESEND_SECONDS)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sentTo || code.length !== 6) return
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({ phone: sentTo, token: code, type: 'sms' })
    if (error || !data.user) {
      setLoading(false)
      setError(friendly(error?.message ?? 'Não foi possível validar o código'))
      return
    }

    try {
      await supabase.rpc('ensure_affiliate_code', {
        p_user_id: data.user.id,
        p_ref_code: getRefCookie(),
        p_wants_affiliate: true,
      })
    } catch {
      // Vinculação de parceiro não pode bloquear o login
    }

    router.push(next)
    router.refresh()
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos por SMS para{' '}
          <span className="font-semibold text-foreground">{maskPhoneBR(sentTo)}</span>.
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">Código</label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={`${authInput} text-center text-2xl tracking-[0.5em] font-semibold`}
            placeholder="••••••"
            autoFocus
            required
          />
        </div>
        <button type="submit" disabled={loading || code.length !== 6} className={authButton}>
          {loading ? 'Validando...' : isSignUp ? 'Confirmar e criar conta' : 'Entrar'}
        </button>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setSentTo(null)
              setError('')
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Trocar número
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={cooldown > 0 || loading}
            className="text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}
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
        <label className="block text-sm font-medium mb-2">Celular</label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
          className={authInput}
          placeholder="(11) 98765-4321"
          required
        />
      </div>
      <button type="submit" disabled={loading} className={authButton}>
        {loading ? 'Enviando...' : 'Receber código por SMS'}
      </button>
    </form>
  )
}
