import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import PedidosView from '@/components/PedidosView'
import type { ItemPedido, Pedido } from '@/lib/pedidos'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import type { Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { pedido?: string }
}) {
  const rol = await obtenerRol()

  if (rol !== 'admin' && rol !== 'supervisor') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🧾 Pedidos a proveedores</h1>
        <p className="text-gray-500 text-sm mt-2">
          Esta pantalla es solo para administradores y supervisores.
        </p>
      </div>
    )
  }

  const supabase = createClient()

  const [pedidos, items, proveedores, catalogo, productos] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id, numero, proveedor_id, estado, fecha_pedido, fecha_estimada, notas, creado_por_email, confirmado_en, confirmado_por_email, cancelado_en, cancelado_por_email, motivo_cancelacion'
      )
      .order('numero', { ascending: false }),
    supabase
      .from('pedido_items')
      .select('id, pedido_id, producto_id, cantidad, precio_unidad'),
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

  const error =
    pedidos.error ?? items.error ?? proveedores.error ?? catalogo.error ?? productos.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🧾 Pedidos a proveedores</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudieron cargar los pedidos: {error.message}
        </p>
      </div>
    )
  }

  const listaPedidos = (pedidos.data ?? []) as Pedido[]

  // Si se llegó con ?pedido=..., se abre ese pedido (solo si existe).
  const pedidoPedido = searchParams?.pedido
  const seleccionInicialId =
    pedidoPedido && listaPedidos.some((p) => p.id === pedidoPedido) ? pedidoPedido : null

  return (
    <PedidosView
      pedidos={listaPedidos}
      items={(items.data ?? []) as ItemPedido[]}
      proveedores={(proveedores.data ?? []) as Proveedor[]}
      catalogo={(catalogo.data ?? []) as ItemCatalogo[]}
      productos={(productos.data ?? []) as Producto[]}
      seleccionInicialId={seleccionInicialId}
    />
  )
}
