import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import ProveedoresView from '@/components/ProveedoresView'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import type { Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  const rol = await obtenerRol()

  if (rol !== 'admin' && rol !== 'supervisor') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🚚 Proveedores</h1>
        <p className="text-gray-500 text-sm mt-2">
          Esta pantalla es solo para administradores y supervisores.
        </p>
      </div>
    )
  }

  const supabase = createClient()

  const [proveedores, catalogo, productos] = await Promise.all([
    supabase
      .from('proveedores')
      .select('id, nombre, telefono, email, notas, activo')
      .order('nombre'),
    supabase
      .from('catalogo_proveedor')
      .select('id, proveedor_id, producto_id, precio, por_bulto, precio_unidad'),
    supabase
      .from('productos')
      .select(
        'id, nombre, codigo, categoria_id, unidades_por_bulto, tiene_vencimiento, stock_minimo, activo'
      )
      .order('nombre'),
  ])

  const error = proveedores.error ?? catalogo.error ?? productos.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🚚 Proveedores</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudieron cargar los proveedores: {error.message}
        </p>
      </div>
    )
  }

  return (
    <ProveedoresView
      proveedores={(proveedores.data ?? []) as Proveedor[]}
      catalogo={(catalogo.data ?? []) as ItemCatalogo[]}
      productos={(productos.data ?? []) as Producto[]}
    />
  )
}
