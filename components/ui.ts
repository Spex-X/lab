export const input =
  'w-full px-4 py-2.5 rounded-xl bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition'

export const label = 'block text-sm font-medium mb-2'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'

export const btnOutline =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed'

export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed'

export const card = 'rounded-2xl border border-border bg-card'

export const alertError = 'px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm'
export const alertSuccess = 'px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm'

export const badge = {
  active: 'bg-primary/15 text-primary',
  paused: 'bg-warning/20 text-warning',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
  paid: 'bg-primary/15 text-primary',
  pending: 'bg-warning/20 text-warning',
  expired: 'bg-destructive/15 text-destructive',
  sold: 'bg-primary/15 text-primary',
  reserved: 'bg-warning/20 text-warning',
  available: 'bg-muted text-muted-foreground',
} as const

export const statusLabel: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  paid: 'Pago',
  pending: 'Pendente',
  expired: 'Expirado',
  sold: 'Vendido',
  reserved: 'Reservado',
  available: 'Disponível',
}

export function badgeClass(status: string) {
  return `inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${badge[status as keyof typeof badge] ?? badge.completed}`
}
