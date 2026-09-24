'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { input, label, btnPrimary, btnOutline, card, alertError } from '@/components/ui'
import { ImageUpload } from '@/components/image-upload'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function CreateRafflePage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_name: '',
    prize_value: '',
    prize_image: '',
    total_tickets: '',
    ticket_price: '',
    draw_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') router.push('/rifas')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Você precisa estar logado para criar uma rifa')
      }

      // Verificar se o perfil existe
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        // Criar perfil se não existir
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
        })
      }

      const { data: raffleData, error: raffleError } = await supabase.from('raffles').insert({
        title: formData.title,
        description: formData.description,
        prize_name: formData.prize_name,
        prize_value: formData.prize_value ? parseFloat(formData.prize_value) : null,
        prize_image: formData.prize_image || null,
        total_tickets: parseInt(formData.total_tickets),
        available_tickets: parseInt(formData.total_tickets),
        ticket_price: parseFloat(formData.ticket_price),
        draw_date: formData.draw_date ? new Date(formData.draw_date).toISOString() : null,
        created_by: session.user.id,
      }).select().single()

      if (raffleError) throw raffleError

      // Gerar bilhetes automaticamente
      const response = await fetch('/api/generate-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: raffleData.id,
          totalTickets: parseInt(formData.total_tickets),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar bilhetes')
      }

      router.push('/minhas-rifas')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const total = Number(formData.total_tickets) || 0
  const price = Number(formData.ticket_price) || 0
  const potential = total * price

  return (
    <UserShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">Nova campanha</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Criar rifa</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className={alertError}>{error}</div>}

            <section className={`${card} p-6 space-y-5`}>
              <h2 className="font-semibold">Informações básicas</h2>

              <div>
                <label className={label}>Título da rifa *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className={input} required placeholder="Ex: Rifa do iPhone 16 Pro" />
              </div>

              <div>
                <label className={label}>Descrição</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={input} placeholder="Descreva os detalhes da rifa..." />
              </div>
            </section>

            <section className={`${card} p-6 space-y-5`}>
              <h2 className="font-semibold">Prêmio</h2>

              <div>
                <label className={label}>Nome do prêmio *</label>
                <input type="text" name="prize_name" value={formData.prize_name} onChange={handleChange} className={input} required placeholder="Ex: iPhone 16 Pro 256GB" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Valor do prêmio (R$)</label>
                  <input type="number" name="prize_value" value={formData.prize_value} onChange={handleChange} step="0.01" className={input} placeholder="5000.00" />
                </div>
                <div>
                  <label className={label}>Imagem do prêmio</label>
                  <ImageUpload
                    value={formData.prize_image}
                    onChange={(url) => setFormData({ ...formData, prize_image: url })}
                  />
                </div>
              </div>
            </section>

            <section className={`${card} p-6 space-y-5`}>
              <h2 className="font-semibold">Números e sorteio</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Total de números *</label>
                  <input type="number" name="total_tickets" value={formData.total_tickets} onChange={handleChange} min="1" className={input} required placeholder="100" />
                </div>
                <div>
                  <label className={label}>Preço por número (R$) *</label>
                  <input type="number" name="ticket_price" value={formData.ticket_price} onChange={handleChange} step="0.01" min="0.01" className={input} required placeholder="10.00" />
                </div>
              </div>

              <div>
                <label className={label}>Data do sorteio</label>
                <input type="datetime-local" name="draw_date" value={formData.draw_date} onChange={handleChange} className={input} />
              </div>
            </section>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className={`${btnPrimary} flex-1 py-3`}>
                {loading ? 'Criando...' : 'Criar rifa'}
              </button>
              <Link href="/dashboard" className={`${btnOutline} py-3`}>Cancelar</Link>
            </div>
          </form>

          {/* PREVIEW */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <div className={`${card} overflow-hidden`}>
              <div className="h-40 bg-gradient-to-br from-primary/25 to-secondary/25">
                {formData.prize_image ? (
                  <img src={formData.prize_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Pré-visualização</p>
                <h3 className="font-semibold truncate">{formData.title || 'Título da rifa'}</h3>
                <p className="text-sm text-muted-foreground truncate mb-4">{formData.prize_name || 'Nome do prêmio'}</p>
                <div className="h-1.5 rounded-full bg-muted mb-4" />
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">Bilhete</p>
                    <p className="text-lg font-semibold">{fmt(price)}</p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">Participar</span>
                </div>
              </div>
            </div>

            <div className={`${card} p-5`}>
              <p className="text-xs text-muted-foreground mb-1">Arrecadação potencial</p>
              <p className="text-2xl font-semibold text-primary">{fmt(potential)}</p>
              <p className="text-xs text-muted-foreground mt-1">{total} números × {fmt(price)}</p>
            </div>
          </aside>
        </div>
      </main>
    </UserShell>
  )
}
