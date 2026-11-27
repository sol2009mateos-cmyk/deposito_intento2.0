import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import { traerTodo } from '@/lib/traerTodo'
import RecepcionView from '@/components/RecepcionView'
import type {
  ItemPorRecibir,
  PedidoPorRecibir,
  Recepcion,
  RecepcionItem,
  RecepcionLote,
} from '@/lib/recepcion'
import type { Lote, Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export default async function RecepcionPage() {
  const rol = await obtenerRol()
  const supabase = createClient()

  const [pendientes, items, productos, lotes, recepciones] = await Promise.all([
    supabase.rpc('pedidos_por_recibir'),
    supabase.rpc('items_por_recibir'),
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
    // Acá hacen falta también los lotes que ya quedaron en cero (para mostrar lo que se recibió).
    traerTodo<Lote>((desde, hasta) =>
      supabase
        .from('lotes')
        .select('id, producto_id, vencimiento, nro_lote, cantidad_actual')
        .order('id')
        .range(desde, hasta)
    ),
    supabase
      .from('recepciones')
      .select(
        'id, pedido_id, pedido_numero, proveedor_nombre, nro_remito, notas, recibido_por_email, recibido_en, anulada_en, anulada_por_email, motivo_anulacion'
      )
      .order('recibido_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
  ])

  const errorPrimero =
    pendientes.error ?? items.error ?? productos.error ?? lotes.error ?? recepciones.error

  if (errorPrimero) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">📥 Recepción</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar la recepción: {errorPrimero.message}
        </p>
      </div>
    )
  }

  // Solo el detalle de las recepciones que se muestran (las últimas 50).
  const listaRecepciones = (recepciones.data ?? []) as Recepcion[]
  const idsRecepciones = listaRecepciones.map((r) => r.id)

  const [recepcionItems, recepcionLotes] =
    idsRecepciones.length === 0
      ? [
          { data: [] as RecepcionItem[], error: null },
          { data: [] as RecepcionLote[], error: null },
        ]
      : await Promise.all([
          traerTodo<RecepcionItem>((desde, hasta) =>
            supabase
              .from('recepcion_items')
              .select('id, recepcion_id, producto_id, pedido_cantidad, recibido, roto, faltante')
              .in('recepcion_id', idsRecepciones)
              .order('id')
              .range(desde, hasta)
          ),
          traerTodo<RecepcionLote>((desde, hasta) =>
            supabase
              .from('recepcion_lotes')
              .select('id, recepcion_id, producto_id, lote_id, cantidad')
              .in('recepcion_id', idsRecepciones)
              .order('id')
              .range(desde, hasta)
          ),
        ])

  const error = recepcionItems.error ?? recepcionLotes.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">📥 Recepción</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar la recepción: {error.message}
        </p>
      </div>
    )
  }

  return (
    <RecepcionView
      pendientes={(pendientes.data ?? []) as PedidoPorRecibir[]}
      itemsPorRecibir={(items.data ?? []) as ItemPorRecibir[]}
      productos={(productos.data ?? []) as Producto[]}
      lotes={(lotes.data ?? []) as Lote[]}
      recepciones={listaRecepciones}
      recepcionItems={recepcionItems.data}
      recepcionLotes={recepcionLotes.data}
      esAdmin={rol === 'admin'}
      puedeReponer={rol === 'admin' || rol === 'supervisor'}
    />
  )
}
