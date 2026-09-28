import { promises as dns } from 'dns'

/**
 * Verifica se o domínio do email pode receber mensagens
 * (registro MX, ou A/AAAA como fallback do RFC — "implicit MX").
 * Uso apenas server-side (API routes).
 */
export async function emailDomainCanReceive(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.trim().toLowerCase()
  if (!domain || domain.length < 3 || !domain.includes('.')) return false

  try {
    const mx = await dns.resolveMx(domain)
    if (mx.length > 0) return true
  } catch {
    // Sem MX — tenta registro A/AAAA (implicit MX)
  }

  try {
    await dns.resolve(domain)
    return true
  } catch {
    return false
  }
}
