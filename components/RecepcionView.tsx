'use client'

import { useMemo, useState } from 'react'
import RecibirPedidoModal from '@/components/RecibirPedidoModal'
import AnularRecepcionModal from '@/components/AnularRecepcionModal'
import { formatearFecha, formatearNumeroPedido } from '@/lib/pedidos'
import { formatearFechaHora } from '@/lib/recepcion'
import type {
  ItemPorRecibir,
  PedidoPorRecibir,
  Recepcion,
  RecepcionItem,
  RecepcionLote,
} from '@/lib/recepcion'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import type { Lote, Producto } from '@/lib/stock'

type Props = {
  pendientes: PedidoPorRecibir[]
  itemsPorRecibir: ItemPorRecibir[]
  productos: Producto[]
  lotes: Lote[]
  recepciones: Recepcion[]
  recepcionItems: RecepcionItem[]
  recepcionLotes: RecepcionLote[]
  esAdmin: boolean
}

function fechaDelPedido(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default function RecepcionView({
  pendientes,
  itemsPorRecibir,
  productos,
  lotes,
  recepciones,
  recepcionItems,
  recepcionLotes,
  esAdmin,
}: Props) {
  const [recibiendo, setRecibiendo] = useState<PedidoPorRecibir | null>(null)
  const [anulando, setAnulando] = useState<Recepcion | null>(null)
  const [expandidaId, setExpandidaId] = useState<string | null>(null)

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  const lotePorId = useMemo(() => {
    const mapa = new Map<string, Lote>()
    lotes.forEach((l) => mapa.set(l.id, l))
    return mapa
  }, [lotes])

  const cantidadPorPedido = useMemo(() => {
    const mapa = new Map<string, number>()
    itemsPorRecibir.forEach((i) =>
      mapa.set(i.pedido_id, (mapa.get(i.pedido_id) ?? 0) + 1)
    )
    return mapa
  }, [itemsPorRecibir])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📥 Recepción</h1>
        <p className="text-gray-500 text-sm mt-1">
          Chequeá lo que llegó contra el pedido y cargá los lotes y vencimientos.
        </p>
      </div>

      <h2 className="text-white font-medium mb-3">Pedidos pendientes de recibir</h2>
      <div className="bg-[#161922] rounded-lg p-4 mb-8">
        {pendientes.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay pedidos pendientes de recibir.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendientes.map((p) => {
              const cantidad = cantidadPorPedido.get(p.id) ?? 0
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-[#0f1117] border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-gray-200 text-sm font-medium">
                      {formatearNumeroPedido(p.numero)} · {p.proveedor_nombre}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Pedido el {fechaDelPedido(p.fecha_pedido)} · Llegada estimada:{' '}
                      {formatearFecha(p.fecha_estimada)} · {cantidad}{' '}
                      {cantidad === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <button
                    onClick={() => setRecibiendo(p)}
                    className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
                  >
                    Recibir
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <h2 className="text-white font-medium mb-3">Recepciones anteriores</h2>
      <div className="bg-[#161922] rounded-lg p-4">
        {recepciones.length === 0 ? (
          <p className="text-gray-500 text-sm">Todavía no se recibió ningún pedido.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recepciones.map((r) => {
              const abierta = expandidaId === r.id
              const anulada = r.anulada_en !== null
              const items = recepcionItems
                .filter((i) => i.recepcion_id === r.id)
                .map((item) => ({ item, producto: productoPorId.get(item.producto_id) }))
                .filter(
                  (f): f is { item: RecepcionItem; producto: Producto } =>
                    f.producto !== undefined
                )
                .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))

              const lineas = recepcionLotes
                .filter((l) => l.recepcion_id === r.id)
                .map((rl) => ({
                  rl,
                  producto: productoPorId.get(rl.producto_id),
                  lote: lotePorId.get(rl.lote_id),
                }))
                .filter(
                  (f): f is { rl: RecepcionLote; producto: Producto; lote: Lote } =>
                    f.producto !== undefined && f.lote !== undefined
                )
                .sort((a, b) => {
                  const va = a.lote.vencimiento
                  const vb = b.lote.vencimiento
                  if (va === vb) return a.producto.nombre.localeCompare(b.producto.nombre)
                  if (va === null) return 1
                  if (vb === null) return -1
                  return va.localeCompare(vb)
                })

              const conObservaciones = items.some((f) => f.item.roto > 0 || f.item.faltante > 0)

              return (
                <div
                  key={r.id}
                  className={`bg-[#0f1117] border border-gray-800 rounded-lg ${
                    anulada ? 'opacity-70' : ''
                  }`}
                >
                  <button
                    onClick={() => setExpandidaId(abierta ? null : r.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800/40 rounded-lg"
                  >
                    <p className="text-gray-200 text-sm font-medium">
                      {formatearNumeroPedido(r.pedido_numero)} · {r.proveedor_nombre}
                      {anulada && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-900 text-red-300">
                          Anulada
                        </span>
                      )}
                      {!anulada && conObservaciones && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-900 text-yellow-300">
                          Con rotos o faltantes
                        </span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Recibido el {formatearFechaHora(r.recibido_en)}
                      {r.recibido_por_email && ` por ${r.recibido_por_email}`}
                      {r.nro_remito && ` · Remito ${r.nro_remito}`}
                    </p>
                  </button>

                  {abierta && (
                    <div className="px-4 pb-4 overflow-x-auto">
                      {anulada && (
                        <p className="text-red-400 text-xs mb-3">
                          Anulada el {formatearFechaHora(r.anulada_en as string)}
                          {r.anulada_por_email && ` por ${r.anulada_por_email}`}
                          {r.motivo_anulacion && `. Motivo: ${r.motivo_anulacion}`}
                        </p>
                      )}

                      {r.notas && (
                        <p className="text-gray-500 text-xs mb-3 whitespace-pre-line">
                          {r.notas}
                        </p>
                      )}

                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-800">
                            <th className="pb-2">Producto</th>
                            <th className="pb-2">Pedido</th>
                            <th className="pb-2">Recibido</th>
                            <th className="pb-2">Rotas</th>
                            <th className="pb-2">Faltan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(({ item, producto }) => (
                            <tr key={item.id} className="border-b border-gray-800">
                              <td className="py-2 text-gray-200">{producto.nombre}</td>
                              <td className="py-2 text-gray-400">
                                {formatearStock(item.pedido_cantidad, producto.unidades_por_bulto)}
                              </td>
                              <td className="py-2 text-gray-300">
                                {formatearStock(item.recibido, producto.unidades_por_bulto)}
                              </td>
                              <td
                                className={`py-2 ${
                                  item.roto > 0 ? 'text-red-400' : 'text-gray-600'
                                }`}
                              >
                                {item.roto > 0
                                  ? formatearStock(item.roto, producto.unidades_por_bulto)
                                  : '—'}
                              </td>
                              <td
                                className={`py-2 ${
                                  item.faltante > 0 ? 'text-yellow-400' : 'text-gray-600'
                                }`}
                              >
                                {item.faltante > 0
                                  ? formatearStock(item.faltante, producto.unidades_por_bulto)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <p className="text-gray-400 text-xs mb-2">
                        Lotes que entraron (lo que vence antes va adelante):
                      </p>
                      {lineas.length === 0 ? (
                        <p className="text-gray-600 text-xs">No entró mercadería al stock.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {lineas.map(({ rl, producto, lote }) => (
                            <p key={rl.id} className="text-gray-400 text-xs">
                              {lote.vencimiento
                                ? `Vence ${formatearVencimiento(lote.vencimiento)}`
                                : 'Sin vencimiento'}{' '}
                              · {producto.nombre} · Lote {lote.nro_lote ?? 'sin número'} ·{' '}
                              {formatearStock(rl.cantidad, producto.unidades_por_bulto)}
                            </p>
                          ))}
                        </div>
                      )}

                      {esAdmin && !anulada && (
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={() => setAnulando(r)}
                            className="text-xs bg-[#161922] hover:bg-gray-800 text-red-400 px-3 py-1.5 rounded-lg"
                          >
                            Anular recepción
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {recibiendo && (
        <RecibirPedidoModal
          pedido={recibiendo}
          items={itemsPorRecibir.filter((i) => i.pedido_id === recibiendo.id)}
          productos={productos}
          onCerrar={() => setRecibiendo(null)}
        />
      )}

      {anulando && (
        <AnularRecepcionModal
          recepcion={anulando}
          onCerrar={() => setAnulando(null)}
        />
      )}
    </div>
  )
}
