'use client'

import { useEffect, useRef, useState } from 'react'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// Pontinhos de brilho subindo no fundo
const SPARKS = [
  { left: '12%', delay: '0s', dur: '3.4s' },
  { left: '28%', delay: '1.2s', dur: '4.1s' },
  { left: '47%', delay: '0.6s', dur: '3.8s' },
  { left: '66%', delay: '1.9s', dur: '3.2s' },
  { left: '82%', delay: '0.9s', dur: '4.4s' },
  { left: '92%', delay: '2.4s', dur: '3.6s' },
]

// Placeholder animado pra quando a rifa não tem imagem:
// o prêmio acumula sozinho, com faíscas subindo e ondas de luz.
export function PrizeVisual({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  const [shown, setShown] = useState(value)
  const [gain, setGain] = useState(0)
  const [tick, setTick] = useState(0)
  const target = useRef(value)

  useEffect(() => {
    target.current = value
  }, [value])

  // A cada 2–4s simula uma nova entrada no pote
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const bump = () => {
      const inc = Math.max(0.05, Math.random() * target.current * 0.003)
      target.current += inc
      setGain(inc)
      setTick((t) => t + 1)
      timer = setTimeout(bump, 2000 + Math.random() * 2000)
    }
    timer = setTimeout(bump, 1200)
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
    const t = setTimeout(() => setGain(0), 1700)
    return () => clearTimeout(t)
  }, [gain])

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-primary/30 via-card to-secondary/30 flex flex-col items-center justify-center">
      {/* anéis de luz expandindo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="absolute w-40 h-40 rounded-full border border-primary/40 animate-[prizeRing_3s_ease-out_infinite]" />
        <span className="absolute w-40 h-40 rounded-full border border-primary/25 animate-[prizeRing_3s_ease-out_1.5s_infinite]" />
      </div>

      {/* faíscas subindo */}
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="absolute bottom-0 w-1 h-1 rounded-full bg-primary/70 animate-[prizeSpark_4s_ease-in_infinite]"
          style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}

      {/* varredura de brilho */}
      <div className="absolute inset-0 overflow-hidden">
        <span className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 animate-[prizeShine_4.5s_ease-in-out_infinite]" />
      </div>

      <span className="relative inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Prêmio acumulando
      </span>

      <span
        key={tick}
        className={`relative font-bold tracking-tight tabular-nums text-primary drop-shadow-[0_0_18px_oklch(0.82_0.13_174/0.45)] ${
          tick > 0 ? 'animate-[prizePop_0.5s_ease-out]' : ''
        } ${size === 'lg' ? 'text-4xl md:text-5xl mt-2' : 'text-2xl md:text-3xl mt-1.5'}`}
      >
        {fmt(shown)}
      </span>

      {gain > 0 && (
        <span
          key={`g${tick}`}
          className="absolute text-xs font-bold text-primary animate-[fadeUp_1.7s_ease-out_forwards]"
          style={{ top: '62%' }}
        >
          +{fmt(gain)}
        </span>
      )}
    </div>
  )
}
