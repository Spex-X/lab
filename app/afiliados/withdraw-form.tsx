'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { input, label, btnPrimary, alertError, alertSuccess } from '@/components/ui'

export function WithdrawForm({ userId, available }: { userId: string; available: number }) {
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: rpcError } = await supabase.rpc('request_withdrawal', {
        p_user_id: userId,
        p_amount: parseFloat(amount),
        p_pix_key: pixKey,
      })

      if (rpcError) throw rpcError
      if (data?.error) throw new Error(data.error)

      setSuccess('Saque solicitado! O pagamento será processado pelo admin.')
      setAmount('')
      setPixKey('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (available <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Você ainda não tem saldo disponível para saque.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className={alertError}>{error}</div>}
      {success && <div className={alertSuccess}>{success}</div>}

      <div>
        <label className={label}>Valor do saque (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={available}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={input}
          placeholder={`Máx: R$ ${available.toFixed(2)}`}
          required
        />
      </div>

      <div>
        <label className={label}>Chave PIX</label>
        <input
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          className={input}
          placeholder="CPF, email, telefone ou chave aleatória"
          required
        />
      </div>

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading ? 'Solicitando...' : 'Solicitar saque'}
      </button>
    </form>
  )
}
