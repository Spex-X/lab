'use client'

import { useSyncExternalStore } from 'react'
import { UserShell, hasCachedUser } from './user-shell'

const noopSubscribe = () => () => {}

function SkeletonContent() {
  return (
    <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded-lg bg-muted" />
        <div className="h-9 w-64 rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-border bg-card" />
    </main>
  )
}

// Fallback de navegação: se o usuário está logado, mantém o menu lateral
// na tela (vem do cache, sem requisição) e mostra o skeleton só no conteúdo.
export function PageSkeleton({ withShell = true }: { withShell?: boolean }) {
  // no servidor (e na hidratação) não há cache → false
  const loggedIn = useSyncExternalStore(noopSubscribe, hasCachedUser, () => false)
  if (withShell && loggedIn) {
    return (
      <UserShell>
        <SkeletonContent />
      </UserShell>
    )
  }
  return <SkeletonContent />
}

export { SkeletonContent }
