'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { AuthShell, authInput, authButton } from '@/components/auth-shell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetar-senha`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl mb-6">
            ✉️
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Email enviado!</h1>
          <p className="text-muted-foreground mb-8">
            Enviamos um email com instruções para redefinir sua senha. Verifique sua caixa de entrada.
          </p>
          <Link href="/login" className={`${authButton} inline-flex w-auto px-6`}>
            Voltar para login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Esqueceu a senha?</h1>
        <p className="text-muted-foreground">Digite seu email para receber instruções de redefinição</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
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

        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Enviando...' : 'Enviar instruções'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground transition">
          ← Voltar para login
        </Link>
      </p>
    </AuthShell>
  )
}
