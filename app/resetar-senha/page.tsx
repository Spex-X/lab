'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { AuthShell, authInput, authButton } from '@/components/auth-shell'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) return setError('As senhas não coincidem')
    if (password.length < 6) return setError('A senha deve ter no mínimo 6 caracteres')

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
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
            ✓
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Senha redefinida!</h1>
          <p className="text-muted-foreground mb-8">Sua senha foi alterada com sucesso. Você já pode fazer login.</p>
          <Link href="/login" className={`${authButton} inline-flex w-auto px-6`}>
            Fazer login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Redefinir senha</h1>
        <p className="text-muted-foreground">Digite sua nova senha abaixo</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nova senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Confirmar nova senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInput}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Processando...' : 'Redefinir senha'}
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
