// Premiação em 3 faixas — cada faixa leva uma % do total arrecadado,
// dividida igualmente entre os ganhadores daquela faixa.
// O valor inicial do prêmio (definido na criação do jogo) é dividido
// nas 3 faixas na mesma proporção das porcentagens.
export const DEFAULT_BASE_PRIZE = 200

export const PRIZE_TIERS = [
  { key: 'sena', label: 'Sena', hits: 6, rate: 0.2529 },
  { key: 'quina', label: 'Quina', hits: 5, rate: 0.0822 },
  { key: 'quadra', label: 'Quadra', hits: 4, rate: 0.0949 },
] as const

export const TOTAL_PRIZE_RATE = PRIZE_TIERS.reduce((acc, t) => acc + t.rate, 0) // 43,00%

// Fatia do valor inicial que cabe a cada faixa (proporcional à sua %)
export function tierBase(tier: (typeof PRIZE_TIERS)[number], baseTotal: number | string | null | undefined) {
  return (Number(baseTotal ?? DEFAULT_BASE_PRIZE) * tier.rate) / TOTAL_PRIZE_RATE
}

// Pote atual de uma faixa: fatia do valor inicial + % da arrecadação
export function tierPot(
  tier: (typeof PRIZE_TIERS)[number],
  arrecadado: number | string | null | undefined,
  baseTotal?: number | string | null
) {
  return tierBase(tier, baseTotal) + Number(arrecadado ?? 0) * tier.rate
}

// Pote total (valor inicial + todas as faixas acumuladas)
export function prizePool(arrecadado: number | string | null | undefined, baseTotal?: number | string | null) {
  return Number(baseTotal ?? DEFAULT_BASE_PRIZE) + Number(arrecadado ?? 0) * TOTAL_PRIZE_RATE
}
