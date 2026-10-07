// Telefones brasileiros: máscara pra digitação e conversão pra E.164 (+55DDDNUMERO)

const digits = (v: string) => v.replace(/\D/g, '')

// "11987654321" -> "(11) 98765-4321"
export function maskPhoneBR(value: string) {
  const d = digits(value).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Retorna "+5511987654321" ou null se não for um celular/fixo BR válido
export function toE164BR(value: string) {
  let d = digits(value)
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return null
  if (d.startsWith('0') || d[2] === '0') return null
  return `+55${d}`
}

// "+5511987654321" / "5511987654321" -> "(11) 98765-4321"
export function formatPhoneBR(value: string | null | undefined) {
  if (!value) return ''
  return maskPhoneBR(digits(value).replace(/^55/, ''))
}
