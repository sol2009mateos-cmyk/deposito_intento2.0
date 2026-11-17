'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)

  // En el celular, el menú se cierra solo al cambiar de pantalla.
  useEffect(() => {
    setMenuAbierto(false)
  }, [pathname])

  if (pathname.startsWith('/login')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      {menuAbierto && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 bg-[#161922] border-b border-gray-800 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="text-white text-2xl leading-none px-1"
            aria-label="Abrir el menú"
          >
            ☰
          </button>
          <span className="text-white font-bold">🏭 Depósito</span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  )
}
