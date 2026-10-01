'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { input, label, btnPrimary, btnOutline, card, alertError } from '@/components/ui'
import { ImageUpload } from '@/components/image-upload'
import { DEFAULT_BASE_PRIZE, PRIZE_TIERS, tierPot } from '@/lib/prize'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Todos os jogos têm exatamente 75 números (1–75)
const TOTAL_TICKETS = 75
// Preço padrão de cada jogo (6 números) — editável no formulário
const DEFAULT_JOGO_PRICE = 10

export default function CreateRafflePage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_image: '',
    draw_date: '',
    base_prize: String(DEFAULT_BASE_PRIZE),
    ticket_price: String(DEFAULT_JOGO_PRICE),
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
      if (profile?.role !== 'admin') router.push('/dashboard')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Você precisa estar logado para criar um jogo')
      }

      // Verificar se o perfil existe
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Criar perfil se não existir
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
        })
      }

      const { data: raffleData, error: raffleError } = await supabase.from('raffles').insert({
        title: formData.title,
        description: formData.description,
        prize_name: formData.title,
        prize_value: basePrize,
        base_prize: basePrize,
        prize_image: formData.prize_image || null,
        total_tickets: TOTAL_TICKETS,
        available_tickets: TOTAL_TICKETS,
        ticket_price: price,
        draw_date: formData.draw_date ? new Date(formData.draw_date).toISOString() : null,
        created_by: user.id,
      }).select().single()

      if (raffleError) throw raffleError

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

  const price = Number(formData.ticket_price) || 0
  const basePrize = Number(formData.base_prize) || 0

  return (
    <UserShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">Nova campanha</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Criar jogo</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className={alertError}>{error}</div>}

            <section className={`${card} p-6 space-y-5`}>
              <h2 className="font-semibold">Informações do jogo</h2>

              <div>
                <label className={label}>Nome do jogo *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className={input} required placeholder="Ex: Pix de R$ 10.000" />
              </div>

              <div>
                <label className={label}>Descrição</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={input} placeholder="Descreva os detalhes do jogo..." />
              </div>

              <div>
                <label className={label}>Valor inicial do prêmio (R$) *</label>
                <input
                  type="number"
                  name="base_prize"
                  min="0"
                  step="0.01"
                  value={formData.base_prize}
                  onChange={handleChange}
                  className={input}
                  required
                />
                <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs space-y-1">
                  {PRIZE_TIERS.map((t) => (
                    <div key={t.key} className="flex justify-between">
                      <span className="text-muted-foreground">{t.label} ({t.hits} acertos)</span>
                      <span className="font-medium">{fmt(tierPot(t, 0, basePrize))}</span>
                    </div>
                  ))}
                  <p className="text-muted-foreground pt-1 border-t border-border">
                    Cresce a cada venda: +{PRIZE_TIERS[0].rate * 100}% Sena · +{PRIZE_TIERS[1].rate * 100}% Quina · +{PRIZE_TIERS[2].rate * 100}% Quadra
                  </p>
                </div>
              </div>

              <div>
                <label className={label}>Imagem (opcional)</label>
                <ImageUpload
                  value={formData.prize_image}
                  onChange={(url) => setFormData({ ...formData, prize_image: url })}
                />
              </div>
            </section>

            <section className={`${card} p-6 space-y-5`}>
              <h2 className="font-semibold">Números e sorteio</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Números</label>
                  <div className={`${input} flex items-center justify-between opacity-80`}>
                    <span>Automático — 75 números</span>
                    <span className="text-xs text-muted-foreground">jogos de 6 (1–75)</span>
                  </div>
                </div>
                <div>
                  <label className={label}>Preço por jogo (R$) *</label>
                  <input
                    type="number"
                    name="ticket_price"
                    min="0.01"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    className={input}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={label}>Data e horário do sorteio *</label>
                <input type="datetime-local" name="draw_date" value={formData.draw_date} onChange={handleChange} className={input} required />
              </div>
            </section>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className={`${btnPrimary} flex-1 py-3`}>
                {loading ? 'Criando...' : 'Criar jogo'}
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
                <h3 className="font-semibold truncate">{formData.title || 'Nome do jogo'}</h3>
                <p className="text-sm text-muted-foreground truncate mb-4">
                  Prêmios {fmt(basePrize)} <span className="text-xs">+ acúmulo por venda</span>
                </p>
                <div className="h-1.5 rounded-full bg-muted mb-4" />
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">Por jogo</p>
                    <p className="text-lg font-semibold">{fmt(price)}</p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold">Participar</span>
                </div>
              </div>
            </div>

            <div className={`${card} p-5`}>
              <p className="text-xs text-muted-foreground mb-1">Preço do jogo</p>
              <p className="text-2xl font-semibold text-primary">{fmt(price)}</p>
              <p className="text-xs text-muted-foreground mt-1">cada jogo = 6 números de 1 a 75</p>
            </div>
          </aside>
        </div>
      </main>
    </UserShell>
  )
}
