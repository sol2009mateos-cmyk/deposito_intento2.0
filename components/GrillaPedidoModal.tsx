'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearNumeroPedido } from '@/lib/pedidos'
import type { ItemPedido, Pedido } from '@/lib/pedidos'
import { formatearPesos } from '@/lib/proveedores'
import type { ItemCatalogo } from '@/lib/proveedores'
import { preciosDistintos } from '@/lib/precios'
import type { Producto } from '@/lib/stock'

export type FilaCatalogo = {
  producto: Producto
  catalogo: ItemCatalogo
}

type Props = {
  pedido: Pedido
  // Todos los productos activos del catálogo del proveedor.
  filasCatalogo: FilaCatalogo[]
  // Lo que ya tiene cargado el pedido.
  itemsPedido: ItemPedido[]
  // Compra mínima del proveedor, si tiene.
  minimo: number | null
  onCerrar: () => void
}

type Valor = { bultos: string; sueltas: string }

const inputNumero =
  'w-20 bg-[#0f1117] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm text-right outline-none focus:border-blue-500'

// Un texto vacío cuenta como 0. Devuelve null si no es un número entero de 0 en adelante.
function leerEntero(texto: string): number | null {
  const limpio = texto.trim()
  if (limpio === '') return 0
  if (!/^\d+$/.test(limpio)) return null
  const numero = Number(limpio)
  return Number.isSafeInteger(numero) ? numero : null
}

export default function GrillaPedidoModal({
  pedido,
  filasCatalogo,
  itemsPedido,
  minimo,
  onCerrar,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const itemPorProducto = useMemo(() => {
    const mapa = new Map<string, ItemPedido>()
    itemsPedido.forEach((i) => mapa.set(i.producto_id, i))
    return mapa
  }, [itemsPedido])

  const filas = useMemo(
    () =>
      [...filasCatalogo].sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre)),
    [filasCatalogo]
  )

  // Lo que ya está en el pedido se muestra como bultos + sueltas.
  const [valores, setValores] = useState<Record<string, Valor>>(() => {
    const inicial: Record<string, Valor> = {}
    filasCatalogo.forEach(({ producto }) => {
      const item = itemPorProducto.get(producto.id)
      const porBulto = producto.unidades_por_bulto
      if (!item) {
        inicial[producto.id] = { bultos: '', sueltas: '' }
      } else if (porBulto > 1) {
        inicial[producto.id] = {
          bultos: String(Math.floor(item.cantidad / porBulto)),
          sueltas: String(item.cantidad % porBulto),
        }
      } else {
        inicial[producto.id] = { bultos: '', sueltas: String(item.cantidad) }
      }
    })
    return inicial
  })

  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function cambiar(productoId: string, campo: keyof Valor, texto: string) {
    setValores((anterior) => ({
      ...anterior,
      [productoId]: { ...anterior[productoId], [campo]: texto },
    }))
  }

  // Unidades totales de una fila (null si hay un dato mal escrito).
  function unidadesDe(producto: Producto): number | null {
    const v = valores[producto.id] ?? { bultos: '', sueltas: '' }
    const bultos = producto.unidades_por_bulto > 1 ? leerEntero(v.bultos) : 0
    const sueltas = leerEntero(v.sueltas)
    if (bultos === null || sueltas === null) return null
    return bultos * producto.unidades_por_bulto + sueltas
  }

  function precioDe(fila: FilaCatalogo): number {
    return itemPorProducto.get(fila.producto.id)?.precio_unidad ?? fila.catalogo.precio_unidad
  }

  const resumen = useMemo(() => {
    let total = 0
    let productos = 0
    let cambios = 0
    let hayError = false

    filas.forEach((fila) => {
      const unidades = unidadesDe(fila.producto)
      if (unidades === null) {
        hayError = true
        return
      }
      const antes = itemPorProducto.get(fila.producto.id)?.cantidad ?? 0
      if (unidades > 0) {
        productos += 1
        total += unidades * (itemPorProducto.get(fila.producto.id)?.precio_unidad ?? fila.catalogo.precio_unidad)
      }
      if (unidades !== antes) cambios += 1
    })

    return { total, productos, cambios, hayError }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, valores, itemPorProducto])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (texto === '') return filas
    return filas.filter(
      ({ producto }) =>
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.codigo ?? '').toLowerCase().includes(texto)
    )
  }, [filas, busqueda])

  // Con Enter se pasa a la casilla siguiente, para cargar sin usar el mouse.
  function alApretarTecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const casillas = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>('input[data-celda]') ?? []
    )
    const posicion = casillas.indexOf(e.currentTarget)
    casillas[posicion + 1]?.focus()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const cambios: { producto_id: string; cantidad: number; precio: number }[] = []

    for (const fila of filas) {
      const unidades = unidadesDe(fila.producto)
      if (unidades === null) {
        setErrorMsg(`Revisá la cantidad de "${fila.producto.nombre}": tiene que ser un número entero.`)
        return
      }
      const antes = itemPorProducto.get(fila.producto.id)?.cantidad ?? 0
      if (unidades !== antes) {
        cambios.push({
          producto_id: fila.producto.id,
          cantidad: unidades,
          precio: precioDe(fila),
        })
      }
    }

    if (cambios.length === 0) {
      setErrorMsg('No cambiaste ninguna cantidad.')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('guardar_grilla_pedido', {
      p_pedido_id: pedido.id,
      p_items: cambios,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
    onCerrar()
  }

  const bajoMinimo = minimo !== null && resumen.productos > 0 && resumen.total < minimo

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        ref={formRef}
        onSubmit={guardar}
        className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[92vh] flex flex-col"
      >
        <h2 className="text-xl font-bold text-white">Cargar pedido en grilla</h2>
        <p className="text-gray-500 text-sm mt-1 mb-3">
          {formatearNumeroPedido(pedido.numero)} · Escribí las cantidades y tocá Enter para pasar a
          la siguiente casilla. Dejá vacío (o en 0) lo que no querés pedir.
        </p>

        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código"
          className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 mb-3"
        />

        <div className="overflow-y-auto flex-1 min-h-0">
          {filas.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">
              Este proveedor no tiene productos activos en el catálogo.
            </p>
          ) : visibles.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No hay productos con esa búsqueda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#161922]">
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-2">Producto</th>
                  <th className="pb-2 pr-2">Precio por unidad</th>
                  <th className="pb-2 pr-2 text-right">Bultos</th>
                  <th className="pb-2 pr-2 text-right">Unidades sueltas</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => {
                  const { producto } = fila
                  const valor = valores[producto.id] ?? { bultos: '', sueltas: '' }
                  const usaBultos = producto.unidades_por_bulto > 1
                  const unidades = unidadesDe(producto)
                  const precio = precioDe(fila)
                  const distinto = preciosDistintos(precio, fila.catalogo.precio_unidad)
                  const enPedido = itemPorProducto.has(producto.id)

                  return (
                    <tr key={producto.id} className="border-b border-gray-800">
                      <td className="py-2 pr-2">
                        <span className="text-gray-200">{producto.nombre}</span>
                        {enPedido && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-blue-900 text-blue-300">
                            En el pedido
                          </span>
                        )}
                        {producto.codigo && (
                          <span className="block text-gray-600 text-xs">{producto.codigo}</span>
                        )}
                        {usaBultos && (
                          <span className="block text-gray-500 text-xs">
                            Bulto de {producto.unidades_por_bulto} u
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-gray-300">
                        {formatearPesos(precio)}
                        {distinto && (
                          <span className="block text-yellow-400 text-xs">
                            Catálogo hoy: {formatearPesos(fila.catalogo.precio_unidad)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {usaBultos ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            data-celda
                            value={valor.bultos}
                            onChange={(e) => cambiar(producto.id, 'bultos', e.target.value)}
                            onKeyDown={alApretarTecla}
                            onFocus={(e) => e.target.select()}
                            className={inputNumero}
                            aria-label={`Bultos de ${producto.nombre}`}
                          />
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          data-celda
                          value={valor.sueltas}
                          onChange={(e) => cambiar(producto.id, 'sueltas', e.target.value)}
                          onKeyDown={alApretarTecla}
                          onFocus={(e) => e.target.select()}
                          className={inputNumero}
                          aria-label={`Unidades sueltas de ${producto.nombre}`}
                        />
                      </td>
                      <td className="py-2 text-right text-gray-200 whitespace-nowrap">
                        {unidades === null ? (
                          <span className="text-red-400 text-xs">Revisar</span>
                        ) : unidades > 0 ? (
                          <>
                            {formatearPesos(unidades * precio)}
                            <span className="block text-gray-500 text-xs">{unidades} u</span>
                          </>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-gray-800 mt-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-gray-400 text-sm">
              {resumen.productos} {resumen.productos === 1 ? 'producto' : 'productos'} · Total{' '}
              <span className="text-white font-bold">{formatearPesos(resumen.total)}</span>
            </p>
            <p className="text-gray-500 text-xs">
              {resumen.cambios === 0
                ? 'Sin cambios'
                : `${resumen.cambios} ${resumen.cambios === 1 ? 'cambio' : 'cambios'} para guardar`}
            </p>
          </div>

          {bajoMinimo && minimo !== null && (
            <p className="text-yellow-300 text-xs mt-1">
              Está por debajo de la compra mínima del proveedor ({formatearPesos(minimo)}). Faltan{' '}
              {formatearPesos(minimo - resumen.total)}.
            </p>
          )}

          {errorMsg && <p className="text-red-400 text-sm mt-2">{errorMsg}</p>}

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onCerrar}
              className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || resumen.cambios === 0 || resumen.hayError}
              className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
            >
              {guardando ? 'Guardando...' : 'Guardar pedido'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
