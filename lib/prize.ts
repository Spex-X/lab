// Prêmio acumulativo: base fixa + percentual da arrecadação (jogos vendidos)
export const BASE_PRIZE = 200
export const PRIZE_RATE = 0.17

export function prizePool(arrecadado: number | string | null | undefined) {
  return BASE_PRIZE + Number(arrecadado ?? 0) * PRIZE_RATE
}
