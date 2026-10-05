'use client'

import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

// Contagem regressiva até o sorteio. Só renderiza no cliente (evita
// diferença de hidratação, já que o horário do servidor é outro).
export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (now === null) return <div className="h-[62px]" />

  const diff = Math.max(0, new Date(target).getTime() - now)
  if (diff === 0) {
    return <p className="text-sm font-semibold text-primary">Sorteio acontecendo agora</p>
  }

  const parts = [
    { v: Math.floor(diff / 864e5), l: 'dias' },
    { v: Math.floor(diff / 36e5) % 24, l: 'horas' },
    { v: Math.floor(diff / 6e4) % 60, l: 'min' },
    { v: Math.floor(diff / 1e3) % 60, l: 'seg' },
  ]

  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="flex-1 rounded-xl bg-muted/60 border border-border py-2 text-center">
          <p className="text-xl font-semibold tabular-nums leading-none">{pad(p.v)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{p.l}</p>
        </div>
      ))}
    </div>
  )
}
