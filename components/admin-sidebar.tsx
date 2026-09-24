'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/rifas', label: 'Rifas', icon: '🎰' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/admin/saques', label: 'Saques', icon: '💸' },
]

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-gray-300 min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
            R
          </div>
          <div>
            <div className="font-bold text-white leading-tight">RifaLab</div>
            <div className="text-[11px] text-gray-500">Administração</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Painel
        </p>
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-red-600/20 text-red-400'
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{it.icon}</span>
              {it.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 hover:text-white transition"
        >
          <span>🏠</span>
          Voltar ao site
        </Link>
        <Link
          href="/logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-600/20 transition"
        >
          <span>🚪</span>
          Sair
        </Link>
        <div className="px-3 pt-3 text-xs text-gray-500 truncate">{email}</div>
      </div>
    </aside>
  )
}
