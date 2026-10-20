import { createClient } from '@/lib/supabase/server'

export type Rol = 'admin' | 'supervisor' | 'operario'

export async function obtenerRol(): Promise<Rol | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  return (perfil?.rol as Rol) ?? null
}
