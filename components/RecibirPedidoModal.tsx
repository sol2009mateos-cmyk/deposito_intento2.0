'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearNumeroPedido } from '@/lib/pedidos'
import { aUnidades } from '@/lib/recepcion'
import type { ItemPorRecibir, ItemRecibido, PedidoPorRecibir } from '@/lib/recepcion'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import type { Producto } from '@/lib/stock'

type Props = {
  pedido: PedidoPorRecibir
  // Productos y cantidades (en unidades) de este pedido, sin precios.
  items: ItemPorRecibir[]
  productos: Producto[]
  onCerrar: () => void
}

type LoteForm = {
  bultos: string
  sueltas: string
  vencimiento: string
  nroLote: string
}

type ProductoForm = {
  lotes: LoteForm[]
  rotoBultos: string
  rotoSueltas: string
}

type LineaResumen = {
  nombre: string
  vencimiento: string | null
  nroLote: string | null
  unidades: number
  porBulto: number
}

type Observacion = {
  nombre: string
  pedido: number
  recibido: number
  roto: number
  faltante: number
  porBulto: number
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

const smallInput =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-blue-500'

function loteVacio(): LoteForm {
  return { bultos: '', sueltas: '', vencimiento: '', nroLote: '' }
}

export default function RecibirPedidoModal({ pedido, items, productos, onCerrar }: Props) {
  const router = useRouter()

  const [forms, setForms] = useState<Record<string, ProductoForm>>(() => {
    const inicial: Record<string, ProductoForm> = {}
    items.forEach((i) => {
      inicial[i.producto_id] = { lotes: [loteVacio()], rotoBultos: '', rotoSueltas: '' }
    })
    return inicial
  })
  const [busqueda, setBusqueda] = useState('')
  const [avisoBusqueda, setAvisoBusqueda] = useState('')
  const contenedor = useRef<HTMLDivElement>(null)
  const [remito, setRemito] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resumen, setResumen] = useState<{
    lineas: LineaResumen[]
    observaciones: Observacion[]
  } | null>(null)

  function cambiarLote(
    productoId: string,
    indice: number,
    campo: keyof LoteForm,
    valor: string
  ) {
    setForms((prev) => {
      const form = prev[productoId]
      const lotes = form.lotes.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l))
      return { ...prev, [productoId]: { ...form, lotes } }
    })
  }

  function agregarLote(productoId: string) {
    setForms((prev) => {
      const form = prev[productoId]
      return { ...prev, [productoId]: { ...form, lotes: [...form.lotes, loteVacio()] } }
    })
  }

  function quitarLote(productoId: string, indice: number) {
    setForms((prev) => {
      const form = prev[productoId]
      return {
        ...prev,
        [productoId]: { ...form, lotes: form.lotes.filter((_, i) => i !== indice) },
      }
    })
  }

  function cambiarRoto(
    productoId: string,
    campo: 'rotoBultos' | 'rotoSueltas',
    valor: string
  ) {
    setForms((prev) => ({
      ...prev,
      [productoId]: { ...prev[productoId], [campo]: valor },
    }))
  }

  // Carga en cada producto lo mismo que se pidió (en un solo lote) y borra los rotos.
  // El vencimiento y el Nº de lote de cada producto se completan a mano.
  function llegoTodoCompleto() {
    setErrorMsg('')
    setForms((prev) => {
      const nuevo: Record<string, ProductoForm> = { ...prev }
      items.forEach((item) => {
        const producto = productos.find((p) => p.id === item.producto_id)
        const form = prev[item.producto_id]
        if (!producto || !form) return
        const porBulto = producto.unidades_por_bulto
        const primero = form.lotes[0] ?? loteVacio()
        nuevo[item.producto_id] = {
          lotes: [
            {
              ...primero,
              bultos: porBulto > 1 ? String(Math.floor(item.cantidad / porBulto)) : '',
              sueltas: String(porBulto > 1 ? item.cantidad % porBulto : item.cantidad),
            },
          ],
          rotoBultos: '',
          rotoSueltas: '',
        }
      })
      return nuevo
    })
  }

  // Busca por código (o nombre). Con Enter (lo que hace el lector de códigos) salta al producto.
  function buscarProducto() {
    const texto = busqueda.trim().toLowerCase()
    if (texto === '') return

    const coincidencias = filas.filter(
      (f) =>
        (f.producto.codigo ?? '').toLowerCase() === texto ||
        f.producto.nombre.toLowerCase().includes(texto) ||
        (f.producto.codigo ?? '').toLowerCase().includes(texto)
    )
    const exacta = coincidencias.find((f) => (f.producto.codigo ?? '').toLowerCase() === texto)
    const elegida = exacta ?? (coincidencias.length === 1 ? coincidencias[0] : null)

    if (!elegida) {
      setAvisoBusqueda(
        coincidencias.length === 0
          ? 'Ese código no corresponde a ningún producto de este pedido.'
          : 'Hay más de un producto con ese texto. Escribí más del código o elegí uno de la lista.'
      )
      return
    }

    setAvisoBusqueda('')
    setBusqueda('')
    setTimeout(() => {
      const campo = contenedor.current?.querySelector<HTMLInputElement>(
        `[data-producto="${elegida.producto.id}"] input[data-primero="1"]`
      )
      if (campo) {
        campo.scrollIntoView({ block: 'center' })
        campo.focus()
        campo.select()
      }
    }, 0)
  }

  // Una fila por producto del pedido, con todo ya convertido a unidades.
  const filas = items
    .map((item) => {
      const producto = productos.find((p) => p.id === item.producto_id)
      const form = forms[item.producto_id]
      if (!producto || !form) return null

      const porBulto = producto.unidades_por_bulto
      const lotes = form.lotes.map((l) => ({
        form: l,
        unidades: aUnidades(l.bultos, l.sueltas, porBulto),
      }))
      const recibido = lotes.reduce((suma, l) => suma + l.unidades, 0)
      const roto = aUnidades(form.rotoBultos, form.rotoSueltas, porBulto)

      return { item, producto, form, porBulto, lotes, recibido, roto }
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))

  const textoFiltro = busqueda.trim().toLowerCase()
  const filasVisibles =
    textoFiltro === ''
      ? filas
      : filas.filter(
          (f) =>
            f.producto.nombre.toLowerCase().includes(textoFiltro) ||
            (f.producto.codigo ?? '').toLowerCase().includes(textoFiltro)
        )

  async function confirmarRecepcion() {
    setErrorMsg('')

    const enviar: ItemRecibido[] = []
    const lineas: LineaResumen[] = []
    const observaciones: Observacion[] = []
    let totalCargado = 0

    for (const fila of filas) {
      const lotesValidos = fila.lotes.filter((l) => l.unidades > 0)

      for (const l of lotesValidos) {
        if (fila.producto.tiene_vencimiento && l.form.vencimiento === '') {
          setErrorMsg(`Falta el vencimiento de un lote de ${fila.producto.nombre}`)
          return
        }
      }

      enviar.push({
        producto_id: fila.producto.id,
        roto: fila.roto,
        lotes: lotesValidos.map((l) => ({
          cantidad: l.unidades,
          vencimiento: fila.producto.tiene_vencimiento ? `${l.form.vencimiento}-01` : null,
          nro_lote: l.form.nroLote.trim() === '' ? null : l.form.nroLote.trim(),
        })),
      })

      lotesValidos.forEach((l) =>
        lineas.push({
          nombre: fila.producto.nombre,
          vencimiento: fila.producto.tiene_vencimiento ? l.form.vencimiento : null,
          nroLote: l.form.nroLote.trim() === '' ? null : l.form.nroLote.trim(),
          unidades: l.unidades,
          porBulto: fila.porBulto,
        })
      )

      const faltante = Math.max(fila.item.cantidad - fila.recibido - fila.roto, 0)
      if (fila.roto > 0 || faltante > 0) {
        observaciones.push({
          nombre: fila.producto.nombre,
          pedido: fila.item.cantidad,
          recibido: fila.recibido,
          roto: fila.roto,
          faltante,
          porBulto: fila.porBulto,
        })
      }

      totalCargado += fila.recibido + fila.roto
    }

    if (totalCargado === 0) {
      setErrorMsg(
        'No cargaste nada de lo recibido. Si no llegó nada, cancelá el pedido desde Pedidos.'
      )
      return
    }

    if (
      !window.confirm(
        `¿Confirmar la recepción de ${formatearNumeroPedido(pedido.numero)}? Después no se puede deshacer.`
      )
    ) {
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('recibir_pedido', {
      p_pedido_id: pedido.id,
      p_remito: remito,
      p_notas: notas,
      p_items: enviar,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    // Resumen para acomodar: primero lo que vence antes, y al final lo que no vence.
    lineas.sort((a, b) => {
      if (a.vencimiento === b.vencimiento) return a.nombre.localeCompare(b.nombre)
      if (a.vencimiento === null) return 1
      if (b.vencimiento === null) return -1
      return a.vencimiento.localeCompare(b.vencimiento)
    })

    setResumen({ lineas, observaciones })
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">
          Recibir {formatearNumeroPedido(pedido.numero)}
        </h2>
        <p className="text-gray-500 text-sm mt-1 mb-4">{pedido.proveedor_nombre}</p>

        {resumen ? (
          <div>
            <p className="text-green-400 text-sm mb-4">
              La recepción quedó registrada y el stock ya está actualizado.
            </p>

            <h3 className="text-white font-medium text-sm mb-2">
              Para acomodar (lo que vence antes va adelante)
            </h3>
            {resumen.lineas.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">No entró mercadería al stock.</p>
            ) : (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2">Vence</th>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2">Lote</th>
                    <th className="pb-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.lineas.map((l, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 text-gray-300">
                        {l.vencimiento ? formatearVencimiento(l.vencimiento) : 'Sin vencimiento'}
                      </td>
                      <td className="py-2 text-gray-200">{l.nombre}</td>
                      <td className="py-2 text-gray-400">{l.nroLote ?? '—'}</td>
                      <td className="py-2 text-gray-300">
                        {formatearStock(l.unidades, l.porBulto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {resumen.observaciones.length > 0 && (
              <div className="mb-4">
                <h3 className="text-yellow-400 font-medium text-sm mb-2">
                  Rotos y faltantes (para reclamarle al proveedor)
                </h3>
                <ul className="text-gray-400 text-xs list-disc ml-5">
                  {resumen.observaciones.map((o, i) => (
                    <li key={i}>
                      {o.nombre}: se pidieron {formatearStock(o.pedido, o.porBulto)}, llegaron{' '}
                      {formatearStock(o.recibido, o.porBulto)}
                      {o.roto > 0 && `, rotas ${formatearStock(o.roto, o.porBulto)}`}
                      {o.faltante > 0 && `, faltan ${formatearStock(o.faltante, o.porBulto)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={onCerrar}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Cargá lo que llegó de cada producto. Si un producto vino en lotes distintos,
              agregá un lote por cada vencimiento.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                type="text"
                autoFocus
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setAvisoBusqueda('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    buscarProducto()
                  }
                }}
                placeholder="Escaneá o escribí el código del producto y apretá Enter"
                className={`${inputClass} flex-1 min-w-[240px]`}
              />
              <button
                type="button"
                onClick={llegoTodoCompleto}
                className="text-sm bg-[#0f1117] hover:bg-gray-800 text-green-400 px-3 py-2 rounded-lg"
              >
                Llegó todo completo
              </button>
            </div>
            {avisoBusqueda && <p className="text-yellow-400 text-xs mb-3">{avisoBusqueda}</p>}
            <p className="text-gray-600 text-xs mb-4">
              &quot;Llegó todo completo&quot; carga las cantidades pedidas. Después completá los
              vencimientos y corregí lo que haya venido distinto.
            </p>

            <div ref={contenedor} className="flex flex-col gap-4">
              {filasVisibles.length === 0 && (
                <p className="text-gray-500 text-sm">Ningún producto coincide con la búsqueda.</p>
              )}
              {filasVisibles.map((fila) => {
                const faltante = Math.max(
                  fila.item.cantidad - fila.recibido - fila.roto,
                  0
                )
                const usaBultos = fila.porBulto > 1
                return (
                  <div
                    key={fila.producto.id}
                    data-producto={fila.producto.id}
                    className="bg-[#0f1117] border border-gray-800 rounded-lg p-4"
                  >
                    <p className="text-gray-200 text-sm font-medium">
                      {fila.producto.nombre}
                    </p>
                    <p className="text-gray-500 text-xs mb-3">
                      Pedido: {formatearStock(fila.item.cantidad, fila.porBulto)}
                      {usaBultos && ` · 1 bulto = ${fila.porBulto} u`}
                    </p>

                    {fila.form.lotes.map((l, indice) => (
                      <div
                        key={indice}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end mb-2"
                      >
                        {usaBultos ? (
                          <div>
                            <label className="block text-gray-500 text-xs mb-1">Bultos</label>
                            <input
                              type="number"
                              min={0}
                              value={l.bultos}
                              data-primero={indice === 0 ? '1' : undefined}
                              onChange={(e) =>
                                cambiarLote(fila.producto.id, indice, 'bultos', e.target.value)
                              }
                              className={smallInput}
                            />
                          </div>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                        <div>
                          <label className="block text-gray-500 text-xs mb-1">
                            {usaBultos ? 'Unidades sueltas' : 'Unidades'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={l.sueltas}
                            data-primero={indice === 0 && !usaBultos ? '1' : undefined}
                            onChange={(e) =>
                              cambiarLote(fila.producto.id, indice, 'sueltas', e.target.value)
                            }
                            className={smallInput}
                          />
                        </div>
                        {fila.producto.tiene_vencimiento ? (
                          <div>
                            <label className="block text-gray-500 text-xs mb-1">
                              Vencimiento
                            </label>
                            <input
                              type="month"
                              value={l.vencimiento}
                              onChange={(e) =>
                                cambiarLote(
                                  fila.producto.id,
                                  indice,
                                  'vencimiento',
                                  e.target.value
                                )
                              }
                              className={smallInput}
                            />
                          </div>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                        <div>
                          <label className="block text-gray-500 text-xs mb-1">
                            Nº de lote (opcional)
                          </label>
                          <input
                            type="text"
                            value={l.nroLote}
                            onChange={(e) =>
                              cambiarLote(fila.producto.id, indice, 'nroLote', e.target.value)
                            }
                            className={smallInput}
                          />
                        </div>
                        <div>
                          {fila.form.lotes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => quitarLote(fila.producto.id, indice)}
                              className="text-xs text-red-400 hover:text-red-300 py-2"
                            >
                              Quitar lote
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => agregarLote(fila.producto.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 mb-3"
                    >
                      ＋ Agregar otro lote
                    </button>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                      {usaBultos ? (
                        <div>
                          <label className="block text-gray-500 text-xs mb-1">
                            Rotos (bultos)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={fila.form.rotoBultos}
                            onChange={(e) =>
                              cambiarRoto(fila.producto.id, 'rotoBultos', e.target.value)
                            }
                            className={smallInput}
                          />
                        </div>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                      <div>
                        <label className="block text-gray-500 text-xs mb-1">
                          {usaBultos ? 'Rotas (unidades sueltas)' : 'Rotas (unidades)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={fila.form.rotoSueltas}
                          onChange={(e) =>
                            cambiarRoto(fila.producto.id, 'rotoSueltas', e.target.value)
                          }
                          className={smallInput}
                        />
                      </div>
                    </div>

                    <p className="text-gray-400 text-xs mt-3">
                      Entra al stock: {formatearStock(fila.recibido, fila.porBulto)}
                      {fila.roto > 0 && ` · Rotas: ${formatearStock(fila.roto, fila.porBulto)}`}
                      {faltante > 0 && (
                        <span className="text-yellow-400">
                          {' '}
                          · Faltan: {formatearStock(faltante, fila.porBulto)}
                        </span>
                      )}
                      {fila.recibido + fila.roto > fila.item.cantidad && (
                        <span className="text-yellow-400"> · Llegó más de lo pedido</span>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>

            <label className="block text-gray-400 text-sm mt-5 mb-1">
              Nº de remito del proveedor (opcional)
            </label>
            <input
              type="text"
              value={remito}
              onChange={(e) => setRemito(e.target.value)}
              className={`${inputClass} mb-4`}
            />

            <label className="block text-gray-400 text-sm mb-1">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className={`${inputClass} mb-4`}
            />

            {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onCerrar}
                className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRecepcion}
                disabled={guardando}
                className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
              >
                {guardando ? 'Guardando...' : 'Confirmar recepción'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
