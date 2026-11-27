import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import { traerTodo } from '@/lib/traerTodo'
import InventarioView from '@/components/InventarioView'
import type { Categoria, Lote, Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const rol = await obtenerRol()
  const supabase = createClient()

  const [categorias, productos, lotes] = await Promise.all([
    supabase.from('categorias').select('id, nombre').order('nombre'),
    traerTodo<Producto>((desde, hasta) =>
      supabase
        .from('productos')
        .select(
          'id, nombre, codigo, codigo_barras, categoria_id, unidades_por_bulto, tiene_vencimiento, stock_minimo, activo'
        )
        .order('nombre')
        .order('id')
        .range(desde, hasta)
    ),
    // Solo los lotes con stock: los que quedaron en cero no se usan en esta pantalla.
    traerTodo<Lote>((desde, hasta) =>
      supabase
        .from('lotes')
        .select('id, producto_id, vencimiento, nro_lote, cantidad_actual')
        .gt('cantidad_actual', 0)
        .order('id')
        .range(desde, hasta)
    ),
  ])

  const error = categorias.error ?? productos.error ?? lotes.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">📦 Inventario</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar el inventario: {error.message}
        </p>
      </div>
    )
  }

  const puedeEditar = rol === 'admin' || rol === 'supervisor'

  return (
    <InventarioView
      categorias={(categorias.data ?? []) as Categoria[]}
      productos={(productos.data ?? []) as Producto[]}
      lotes={(lotes.data ?? []) as Lote[]}
      puedeEditar={puedeEditar}
    />
  )
}
