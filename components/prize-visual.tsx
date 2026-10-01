'use client'

import { useEffect, useRef, useState } from 'react'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Placeholder animado pra quando a rifa não tem imagem:
// mostra o prêmio acumulado subindo sozinho, como se estivesse ao vivo.
export function PrizeVisual({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  const [shown, setShown] = useState(value)
  const [gain, setGain] = useState(0)
  const target = useRef(value)

  useEffect(() => {
    target.current = value
  }, [value])

  // A cada 2–4s simula uma nova entrada no pote
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const inc = Math.max(0.05, Math.random() * target.current * 0.003)
      target.current += inc
      setGain(inc)
      timer = setTimeout(tick, 2000 + Math.random() * 2000)
    }
    timer = setTimeout(tick, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Ease do valor exibido em direção ao alvo
  useEffect(() => {
    let raf: number
    const step = () => {
      setShown((s) => {
        const diff = target.current - s
        if (Math.abs(diff) < 0.005) return target.current
        return s + diff * 0.14
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!gain) return
    const t = setTimeout(() => setGain(0), 1600)
    return () => clearTimeout(t)
  }, [gain])

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-primary/25 via-card to-secondary/25 flex flex-col items-center justify-center`}
    >
      {/* brilho pulsante ao fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.82_0.13_174/0.18),transparent_65%)] animate-pulse" />

      <span className="relative inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Prêmio acumulando
      </span>

      <span
        className={`relative font-semibold tracking-tight tabular-nums text-primary drop-shadow-sm ${
          size === 'lg' ? 'text-4xl md:text-5xl mt-2' : 'text-2xl md:text-3xl mt-1.5'
        }`}
      >
        {fmt(shown)}
      </span>

      {gain > 0 && (
        <span className="absolute top-1/3 text-xs font-semibold text-primary animate-[fadeUp_1.6s_ease-out_forwards]">
          +{fmt(gain)}
        </span>
      )}
    </div>
  )
}
