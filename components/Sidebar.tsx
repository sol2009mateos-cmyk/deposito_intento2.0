'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Rol = 'admin' | 'supervisor' | 'operario'

const links: { href: string; label: string; icon: string; roles: Rol[] }[] = [
  { href: '/', label: 'Inicio', icon: '📊', roles: ['admin', 'supervisor', 'operario'] },
  { href: '/usuarios', label: 'Usuarios', icon: '🔑', roles: ['admin'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null)
      if (data.user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', data.user.id)
          .single()
        setRol((perfil?.rol as Rol) ?? null)
      }
    })
  }, [])

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linksVisibles = rol ? links.filter((l) => l.roles.includes(rol)) : []

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#161922] border-r border-gray-800 flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-2xl">🏭</span>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Depósito</h1>
          <p className="text-xs text-gray-500">Stock y pedidos</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {linksVisibles.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 pt-3 mt-3">
        {email && (
          <p className="text-gray-500 text-xs px-2 mb-1 truncate" title={email}>
            {email}
          </p>
        )}
        {rol && (
          <p className="text-gray-600 text-xs px-2 mb-2 capitalize">{rol}</p>
        )}
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
