import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
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

  const [pendientes, items, productos, lotes, recepciones, recepcionItems, recepcionLotes] =
    await Promise.all([
      supabase.rpc('pedidos_por_recibir'),
      supabase.rpc('items_por_recibir'),
      supabase
        .from('productos')
        .select(
          'id, nombre, codigo, categoria_id, unidades_por_bulto, tiene_vencimiento, stock_minimo, activo'
        )
        .order('nombre'),
      supabase
        .from('lotes')
        .select('id, producto_id, vencimiento, nro_lote, cantidad_actual'),
      supabase
        .from('recepciones')
        .select(
          'id, pedido_id, pedido_numero, proveedor_nombre, nro_remito, notas, recibido_por_email, recibido_en, anulada_en, anulada_por_email, motivo_anulacion'
        )
        .order('recibido_en', { ascending: false })
        .limit(50),
      supabase
        .from('recepcion_items')
        .select('id, recepcion_id, producto_id, pedido_cantidad, recibido, roto, faltante'),
      supabase
        .from('recepcion_lotes')
        .select('id, recepcion_id, producto_id, lote_id, cantidad'),
    ])

  const error =
    pendientes.error ??
    items.error ??
    productos.error ??
    lotes.error ??
    recepciones.error ??
    recepcionItems.error ??
    recepcionLotes.error

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
      recepciones={(recepciones.data ?? []) as Recepcion[]}
      recepcionItems={(recepcionItems.data ?? []) as RecepcionItem[]}
      recepcionLotes={(recepcionLotes.data ?? []) as RecepcionLote[]}
      esAdmin={rol === 'admin'}
      puedeReponer={rol === 'admin' || rol === 'supervisor'}
    />
  )
}
