const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'live.com',
  'msn.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'proton.me',
]

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = curr
  }
  return prev[n]
}

/**
 * Retorna o email corrigido quando o domínio parece um typo
 * de um provedor comum (ex: gmail.comd → gmail.com).
 * Retorna null se o domínio estiver ok ou não tiver sugestão.
 */
export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (COMMON_DOMAINS.includes(domain)) return null

  let best: string | null = null
  let bestDist = 3 // só aceita distância 1 ou 2
  for (const d of COMMON_DOMAINS) {
    const dist = levenshtein(domain, d)
    if (dist < bestDist) {
      best = d
      bestDist = dist
    }
  }
  return best ? `${local}@${best}` : null
}
