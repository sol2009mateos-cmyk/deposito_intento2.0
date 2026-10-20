'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Usuario = {
  id: string
  email: string
  rol: 'admin' | 'supervisor' | 'operario'
  creado_en: string
}

const ROLES: { valor: Usuario['rol']; label: string; color: string }[] = [
  { valor: 'admin', label: 'Admin', color: 'bg-red-900 text-red-300' },
  { valor: 'supervisor', label: 'Supervisor', color: 'bg-yellow-900 text-yellow-300' },
  { valor: 'operario', label: 'Operario', color: 'bg-blue-900 text-blue-300' },
]

export default function UsuariosView({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function cambiarRol(usuarioId: string, nuevoRol: string) {
    setGuardandoId(usuarioId)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.rpc('cambiar_rol_usuario', {
      p_usuario_id: usuarioId,
      p_nuevo_rol: nuevoRol,
    })

    setGuardandoId(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">🔑 Usuarios</h1>
      <p className="text-gray-500 text-sm mb-6">
        Administrá los roles de las personas que tienen acceso al sistema.
      </p>

      {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

      <div className="bg-[#161922] rounded-lg p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2">Email</th>
              <th className="pb-2">Rol actual</th>
              <th className="pb-2">Registrado</th>
              <th className="pb-2 text-right">Cambiar rol a</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const rolInfo = ROLES.find((r) => r.valor === u.rol)
              return (
                <tr key={u.id} className="border-b border-gray-800">
                  <td className="py-3 text-gray-200">{u.email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${rolInfo?.color}`}>
                      {rolInfo?.label ?? u.rol}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(u.creado_en).toLocaleDateString('es-AR')}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {ROLES.filter((r) => r.valor !== u.rol).map((r) => (
                        <button
                          key={r.valor}
                          onClick={() => cambiarRol(u.id, r.valor)}
                          disabled={guardandoId === u.id}
                          className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-50 text-gray-300 px-2 py-1.5 rounded-lg"
                        >
                          {guardandoId === u.id ? '...' : r.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
