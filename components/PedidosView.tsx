'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PedidoModal from '@/components/PedidoModal'
import ItemPedidoModal from '@/components/ItemPedidoModal'
import type { DisponibleCatalogo } from '@/components/ItemPedidoModal'
import {
  COLOR_ESTADO,
  NOMBRE_ESTADO,
  formatearFecha,
  formatearNumeroPedido,
  totalPedido,
} from '@/lib/pedidos'
import type { EstadoPedido, ItemPedido, Pedido } from '@/lib/pedidos'
import { formatearPesos } from '@/lib/proveedores'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import { formatearStock } from '@/lib/stock'
import type { Producto } from '@/lib/stock'

type Props = {
  pedidos: Pedido[]
  items: ItemPedido[]
  proveedores: Proveedor[]
  catalogo: ItemCatalogo[]
  productos: Producto[]
}

function fechaDelPedido(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default function PedidosView({
  pedidos,
  items,
  proveedores,
  catalogo,
  productos,
}: Props) {
  const router = useRouter()

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalPedido, setModalPedido] = useState<{ pedido: Pedido | null } | null>(null)
  const [modalItem, setModalItem] = useState<{
    editar: { item: ItemPedido; producto: Producto } | null
  } | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const proveedorPorId = useMemo(() => {
    const mapa = new Map<string, Proveedor>()
    proveedores.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [proveedores])

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  const itemsPorPedido = useMemo(() => {
    const mapa = new Map<string, ItemPedido[]>()
    items.forEach((i) => {
      const lista = mapa.get(i.pedido_id) ?? []
      lista.push(i)
      mapa.set(i.pedido_id, lista)
    })
    return mapa
  }, [items])

  const visibles = useMemo(
    () => pedidos.filter((p) => filtroEstado === '' || p.estado === filtroEstado),
    [pedidos, filtroEstado]
  )

  const seleccionado: Pedido | null =
    pedidos.find((p) => p.id === seleccionadoId) ??
    (seleccionadoId === null ? visibles[0] ?? null : null)

  const itemsSeleccionado = seleccionado ? itemsPorPedido.get(seleccionado.id) ?? [] : []

  const filas = useMemo(
    () =>
      itemsSeleccionado
        .map((item) => ({ item, producto: productoPorId.get(item.producto_id) }))
        .filter(
          (f): f is { item: ItemPedido; producto: Producto } => f.producto !== undefined
        )
        .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre)),
    [itemsSeleccionado, productoPorId]
  )

  // Productos del catálogo del proveedor que todavía no están en este pedido.
  const disponibles: DisponibleCatalogo[] = useMemo(() => {
    if (!seleccionado) return []
    const yaEnPedido = new Set(itemsSeleccionado.map((i) => i.producto_id))
    const lista: DisponibleCatalogo[] = []
    catalogo.forEach((c) => {
      if (c.proveedor_id !== seleccionado.proveedor_id) return
      if (yaEnPedido.has(c.producto_id)) return
      const producto = productoPorId.get(c.producto_id)
      if (producto && producto.activo) lista.push({ producto, catalogo: c })
    })
    return lista.sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
  }, [seleccionado, itemsSeleccionado, catalogo, productoPorId])

  async function ejecutar(
    clave: string,
    funcion: string,
    parametros: Record<string, string>
  ) {
    setErrorMsg('')
    setTrabajando(clave)

    const supabase = createClient()
    const { error } = await supabase.rpc(funcion, parametros)

    setTrabajando(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
  }

  function confirmar(pedido: Pedido) {
    if (
      !window.confirm(
        `¿Confirmar el pedido ${formatearNumeroPedido(pedido.numero)}? Después no se va a poder editar.`
      )
    ) {
      return
    }
    ejecutar('confirmar', 'confirmar_pedido', { p_id: pedido.id })
  }

  function cancelar(pedido: Pedido) {
    if (!window.confirm(`¿Cancelar el pedido ${formatearNumeroPedido(pedido.numero)}?`)) {
      return
    }
    ejecutar('cancelar', 'cancelar_pedido', { p_id: pedido.id })
  }

  function quitar(pedido: Pedido, producto: Producto) {
    if (!window.confirm(`¿Quitar "${producto.nombre}" del pedido?`)) return
    ejecutar(`quitar-${producto.id}`, 'quitar_item_pedido', {
      p_pedido_id: pedido.id,
      p_producto_id: producto.id,
    })
  }

  const estados = Object.keys(NOMBRE_ESTADO) as EstadoPedido[]
  const esBorrador = seleccionado?.estado === 'borrador'
  const puedeCancelar = seleccionado?.estado === 'borrador' || seleccionado?.estado === 'pendiente'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🧾 Pedidos a proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            El pedido se arma en borrador y, al confirmarlo, queda pendiente de recibir.
          </p>
        </div>
        <button
          onClick={() => setModalPedido({ pedido: null })}
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
        >
          ＋ Nuevo pedido
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="bg-[#161922] rounded-lg p-6">
          <p className="text-gray-500 text-sm">
            Todavía no hay pedidos. Creá el primero con &quot;Nuevo pedido&quot;.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="bg-[#161922] rounded-lg p-2 w-full lg:w-80 shrink-0">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 mb-2"
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>
                  {NOMBRE_ESTADO[e]}
                </option>
              ))}
            </select>

            {visibles.length === 0 ? (
              <p className="text-gray-500 text-sm px-2 py-3">
                No hay pedidos en ese estado.
              </p>
            ) : (
              visibles.map((p) => {
                const activoSel = seleccionado?.id === p.id
                const total = totalPedido(itemsPorPedido.get(p.id) ?? [])
                return (
                  <button
                    key={p.id}
                    onClick={() => setSeleccionadoId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                      activoSel ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatearNumeroPedido(p.numero)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${COLOR_ESTADO[p.estado]}`}>
                        {NOMBRE_ESTADO[p.estado]}
                      </span>
                    </span>
                    <span
                      className={`block text-xs ${
                        activoSel ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {proveedorPorId.get(p.proveedor_id)?.nombre ?? '—'} ·{' '}
                      {fechaDelPedido(p.fecha_pedido)} · {formatearPesos(total)}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {seleccionado && (
            <div className="bg-[#161922] rounded-lg p-4 flex-1 w-full overflow-x-auto">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {formatearNumeroPedido(seleccionado.numero)}{' '}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        COLOR_ESTADO[seleccionado.estado]
                      }`}
                    >
                      {NOMBRE_ESTADO[seleccionado.estado]}
                    </span>
                  </h2>
                  <p className="text-gray-300 text-sm mt-1">
                    {proveedorPorId.get(seleccionado.proveedor_id)?.nombre ?? '—'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Pedido el {fechaDelPedido(seleccionado.fecha_pedido)} · Llegada estimada:{' '}
                    {formatearFecha(seleccionado.fecha_estimada)}
                  </p>
                  {seleccionado.creado_por_email && (
                    <p className="text-gray-600 text-xs">
                      Creado por {seleccionado.creado_por_email}
                    </p>
                  )}
                  {seleccionado.notas && (
                    <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">
                      {seleccionado.notas}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {esBorrador && (
                    <>
                      <button
                        onClick={() => setModalPedido({ pedido: seleccionado })}
                        className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg"
                      >
                        Editar pedido
                      </button>
                      <button
                        onClick={() => setModalItem({ editar: null })}
                        className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg"
                      >
                        ＋ Agregar producto
                      </button>
                      <button
                        onClick={() => confirmar(seleccionado)}
                        disabled={trabajando !== null}
                        className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                      >
                        {trabajando === 'confirmar' ? '...' : 'Confirmar pedido'}
                      </button>
                    </>
                  )}
                  {puedeCancelar && (
                    <button
                      onClick={() => cancelar(seleccionado)}
                      disabled={trabajando !== null}
                      className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded-lg"
                    >
                      {trabajando === 'cancelar' ? '...' : 'Cancelar pedido'}
                    </button>
                  )}
                </div>
              </div>

              {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}

              {filas.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">
                  {esBorrador
                    ? 'Este pedido todavía no tiene productos. Agregá el primero con "Agregar producto".'
                    : 'Este pedido no tiene productos.'}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2">Cantidad</th>
                      <th className="pb-2">Precio por unidad</th>
                      <th className="pb-2">Subtotal</th>
                      {esBorrador && <th className="pb-2 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ item, producto }) => (
                      <tr key={item.id} className="border-b border-gray-800">
                        <td className="py-3">
                          <span className="text-gray-200">{producto.nombre}</span>
                          {producto.codigo && (
                            <span className="block text-gray-600 text-xs">
                              {producto.codigo}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatearStock(item.cantidad, producto.unidades_por_bulto)}
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatearPesos(item.precio_unidad)}
                          {producto.unidades_por_bulto > 1 && (
                            <span className="block text-gray-500 text-xs">
                              {formatearPesos(item.precio_unidad * producto.unidades_por_bulto)}{' '}
                              por bulto
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-200">
                          {formatearPesos(item.cantidad * item.precio_unidad)}
                        </td>
                        {esBorrador && (
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setModalItem({ editar: { item, producto } })}
                                className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-2 py-1.5 rounded-lg"
                              >
                                Cambiar
                              </button>
                              <button
                                onClick={() => quitar(seleccionado, producto)}
                                disabled={trabajando !== null}
                                className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-50 text-red-400 px-2 py-1.5 rounded-lg"
                              >
                                {trabajando === `quitar-${producto.id}` ? '...' : 'Quitar'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right text-gray-400">
                        Total del pedido
                      </td>
                      <td className="pt-3 text-white font-bold">
                        {formatearPesos(totalPedido(itemsSeleccionado))}
                      </td>
                      {esBorrador && <td />}
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {modalPedido && (
        <PedidoModal
          proveedores={proveedores}
          pedido={modalPedido.pedido}
          onCreado={(id) => {
            setFiltroEstado('')
            setSeleccionadoId(id)
          }}
          onCerrar={() => setModalPedido(null)}
        />
      )}

      {modalItem && seleccionado && (
        <ItemPedidoModal
          pedido={seleccionado}
          disponibles={disponibles}
          editar={modalItem.editar}
          onCerrar={() => setModalItem(null)}
        />
      )}
    </div>
  )
}
