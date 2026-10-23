import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import UsuariosView from '@/components/UsuariosView'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const rol = await obtenerRol()

  if (rol !== 'admin') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🔑 Usuarios</h1>
        <p className="text-gray-500 text-sm mt-2">
          Esta pantalla es solo para administradores.
        </p>
      </div>
    )
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('listar_usuarios')

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🔑 Usuarios</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar la lista de usuarios: {error.message}
        </p>
      </div>
    )
  }

  return <UsuariosView usuarios={data ?? []} />
}
