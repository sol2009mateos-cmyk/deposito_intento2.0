import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import QuePedirView from '@/components/QuePedirView'
import { calcularBajoStock, stockPorProducto } from '@/lib/reposicion'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import type { Lote, Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

export default async function QuePedirPage() {
  const rol = await obtenerRol()

  if (rol !== 'admin' && rol !== 'supervisor') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🛒 Qué pedir</h1>
        <p className="text-gray-500 text-sm mt-2">
          Esta pantalla es solo para administradores y supervisores.
        </p>
      </div>
    )
  }

  const supabase = createClient()

  const [productos, lotes, catalogo, proveedores, pedidos, items] = await Promise.all([
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
      .from('catalogo_proveedor')
      .select('id, proveedor_id, producto_id, precio, por_bulto, precio_unidad'),
    supabase
      .from('proveedores')
      .select('id, nombre, telefono, email, notas, activo')
      .order('nombre'),
    supabase.from('pedidos').select('id, estado').in('estado', ['borrador', 'pendiente']),
    supabase.from('pedido_items').select('pedido_id, producto_id, cantidad'),
  ])

  const error =
    productos.error ??
    lotes.error ??
    catalogo.error ??
    proveedores.error ??
    pedidos.error ??
    items.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🛒 Qué pedir</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo calcular qué pedir: {error.message}
        </p>
      </div>
    )
  }

  // Unidades que ya vienen en pedidos pendientes, y las que están en borradores.
  const estadoPorPedido = new Map<string, string>()
  ;(pedidos.data ?? []).forEach((p) => estadoPorPedido.set(p.id as string, p.estado as string))

  const enCamino = new Map<string, number>()
  const enBorrador = new Map<string, number>()
  ;(items.data ?? []).forEach((i) => {
    const estado = estadoPorPedido.get(i.pedido_id as string)
    if (estado === 'pendiente') {
      enCamino.set(
        i.producto_id as string,
        (enCamino.get(i.producto_id as string) ?? 0) + (i.cantidad as number)
      )
    } else if (estado === 'borrador') {
      enBorrador.set(
        i.producto_id as string,
        (enBorrador.get(i.producto_id as string) ?? 0) + (i.cantidad as number)
      )
    }
  })

  const listaCatalogo = (catalogo.data ?? []) as ItemCatalogo[]
  const proveedorPorProducto = new Map<string, string>()
  const precios: Record<string, number> = {}
  listaCatalogo.forEach((c) => {
    proveedorPorProducto.set(c.producto_id, c.proveedor_id)
    precios[c.producto_id] = c.precio_unidad
  })

  const bajos = calcularBajoStock(
    (productos.data ?? []) as Producto[],
    stockPorProducto((lotes.data ?? []) as Lote[]),
    enCamino,
    enBorrador,
    proveedorPorProducto,
    true
  )

  return (
    <QuePedirView
      bajos={bajos}
      proveedores={(proveedores.data ?? []) as Proveedor[]}
      precios={precios}
    />
  )
}
