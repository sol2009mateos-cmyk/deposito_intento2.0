'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearPesos } from '@/lib/proveedores'
import type { Proveedor } from '@/lib/proveedores'
import { FACTOR_REPOSICION } from '@/lib/reposicion'
import type { ProductoBajo } from '@/lib/reposicion'
import { formatearStock } from '@/lib/stock'

type Props = {
  bajos: ProductoBajo[]
  proveedores: Proveedor[]
  // Precio por unidad del catálogo, por producto.
  precios: Record<string, number>
}

type FilaForm = { incluir: boolean; cantidad: string }

const smallInput =
  'w-24 bg-[#0f1117] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-blue-500'

// La cantidad se carga en bultos si el producto viene en bultos, y si no, en unidades.
function cantidadInicial(b: ProductoBajo): string {
  const porBulto = b.producto.unidades_por_bulto
  return String(porBulto > 1 ? b.sugerido / porBulto : b.sugerido)
}

export default function QuePedirView({ bajos, proveedores, precios }: Props) {
  const router = useRouter()

  const [forms, setForms] = useState<Record<string, FilaForm>>(() => {
    const inicial: Record<string, FilaForm> = {}
    bajos.forEach((b) => {
      inicial[b.producto.id] = { incluir: true, cantidad: cantidadInicial(b) }
    })
    return inicial
  })
  const [creando, setCreando] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const proveedorPorId = useMemo(() => {
    const mapa = new Map<string, Proveedor>()
    proveedores.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [proveedores])

  // Agrupados por proveedor; los que no tienen proveedor van aparte.
  const { grupos, sinProveedor } = useMemo(() => {
    const porProveedor = new Map<string, ProductoBajo[]>()
    const sin: ProductoBajo[] = []

    bajos.forEach((b) => {
      if (b.proveedorId === null) {
        sin.push(b)
        return
      }
      const lista = porProveedor.get(b.proveedorId) ?? []
      lista.push(b)
      porProveedor.set(b.proveedorId, lista)
    })

    const lista = Array.from(porProveedor.entries())
      .map(([id, productos]) => ({
        proveedor: proveedorPorId.get(id) ?? null,
        id,
        productos,
      }))
      .sort((a, b) => (a.proveedor?.nombre ?? '').localeCompare(b.proveedor?.nombre ?? ''))

    return { grupos: lista, sinProveedor: sin }
  }, [bajos, proveedorPorId])

  function cambiar(productoId: string, cambio: Partial<FilaForm>) {
    setForms((prev) => ({ ...prev, [productoId]: { ...prev[productoId], ...cambio } }))
  }

  // Unidades a pedir de un producto, según lo que hay cargado en pantalla.
  function unidadesDe(b: ProductoBajo): number {
    const form = forms[b.producto.id]
    if (!form || !form.incluir) return 0
    const n = parseInt(form.cantidad, 10)
    if (Number.isNaN(n) || n <= 0) return 0
    return n * (b.producto.unidades_por_bulto > 1 ? b.producto.unidades_por_bulto : 1)
  }

  async function crearBorrador(proveedorId: string, productos: ProductoBajo[]) {
    setErrores((prev) => ({ ...prev, [proveedorId]: '' }))

    const items = productos
      .map((b) => ({ producto_id: b.producto.id, cantidad: unidadesDe(b) }))
      .filter((i) => i.cantidad > 0)

    if (items.length === 0) {
      setErrores((prev) => ({
        ...prev,
        [proveedorId]: 'Marcá al menos un producto con cantidad mayor a cero',
      }))
      return
    }

    setCreando(proveedorId)

    const supabase = createClient()
    const { data, error } = await supabase.rpc('crear_pedido_sugerido', {
      p_proveedor_id: proveedorId,
      p_items: items,
    })

    setCreando(null)

    if (error) {
      setErrores((prev) => ({ ...prev, [proveedorId]: error.message }))
      return
    }

    router.push(`/pedidos?pedido=${data as string}`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🛒 Qué pedir</h1>
        <p className="text-gray-500 text-sm mt-1">
          Productos con stock en el mínimo o por debajo, sin contar lo que ya viene en pedidos
          pendientes. Se sugiere reponer hasta {FACTOR_REPOSICION} veces el stock mínimo, en bultos
          completos. Podés cambiar cada cantidad antes de crear el borrador.
        </p>
      </div>

      {bajos.length === 0 && (
        <div className="bg-[#161922] rounded-lg p-6">
          <p className="text-green-400 text-sm">Todo en orden: no hay nada para pedir.</p>
          <p className="text-gray-500 text-xs mt-2">
            Solo se controlan los productos que tienen cargado el stock mínimo. Podés cargarlo en
            Inventario, con el botón Editar de cada producto.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {grupos.map(({ id, proveedor, productos }) => {
          const total = productos.reduce(
            (suma, b) => suma + unidadesDe(b) * (precios[b.producto.id] ?? 0),
            0
          )
          const inactivo = proveedor !== null && !proveedor.activo

          return (
            <div key={id} className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-white">
                  {proveedor?.nombre ?? 'Proveedor'}
                  {inactivo && (
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                      Inactivo
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">
                    Estimado: <span className="text-white font-medium">{formatearPesos(total)}</span>
                  </span>
                  <button
                    onClick={() => crearBorrador(id, productos)}
                    disabled={creando !== null || inactivo}
                    className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
                  >
                    {creando === id ? 'Creando...' : 'Crear borrador de pedido'}
                  </button>
                </div>
              </div>

              {errores[id] && <p className="text-red-400 text-sm mb-3">{errores[id]}</p>}

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2">Pedir</th>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2">Stock / mínimo</th>
                    <th className="pb-2">En camino</th>
                    <th className="pb-2">Cantidad</th>
                    <th className="pb-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((b) => {
                    const form = forms[b.producto.id]
                    const usaBultos = b.producto.unidades_por_bulto > 1
                    const unidades = unidadesDe(b)
                    return (
                      <tr key={b.producto.id} className="border-b border-gray-800">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={form?.incluir ?? false}
                            onChange={(e) =>
                              cambiar(b.producto.id, { incluir: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-3">
                          <span className="text-gray-200">{b.producto.nombre}</span>
                          {b.producto.codigo && (
                            <span className="block text-gray-600 text-xs">
                              {b.producto.codigo}
                            </span>
                          )}
                          {b.enBorrador > 0 && (
                            <span className="block text-yellow-400 text-xs">
                              Ya hay {formatearStock(b.enBorrador, b.producto.unidades_por_bulto)} en
                              un pedido en borrador
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-300">
                          <span className={b.stock === 0 ? 'text-red-400' : ''}>
                            {formatearStock(b.stock, b.producto.unidades_por_bulto)}
                          </span>
                          <span className="block text-gray-600 text-xs">
                            mínimo {b.minimo} u
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">
                          {b.enCamino > 0
                            ? formatearStock(b.enCamino, b.producto.unidades_por_bulto)
                            : '—'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={form?.cantidad ?? ''}
                              onChange={(e) =>
                                cambiar(b.producto.id, { cantidad: e.target.value })
                              }
                              className={smallInput}
                            />
                            <span className="text-gray-500 text-xs">
                              {usaBultos ? 'bultos' : 'u'}
                            </span>
                          </div>
                          {usaBultos && unidades > 0 && (
                            <span className="block text-gray-600 text-xs mt-1">
                              {unidades} u
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatearPesos(unidades * (precios[b.producto.id] ?? 0))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}

        {sinProveedor.length > 0 && (
          <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-1">Sin proveedor asignado</h2>
            <p className="text-gray-500 text-xs mb-3">
              Estos productos necesitan pedirse, pero no están en el catálogo de ningún
              proveedor. Agregalos desde Proveedores para poder pedirlos.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Stock / mínimo</th>
                  <th className="pb-2">En camino</th>
                </tr>
              </thead>
              <tbody>
                {sinProveedor.map((b) => (
                  <tr key={b.producto.id} className="border-b border-gray-800">
                    <td className="py-3 text-gray-200">{b.producto.nombre}</td>
                    <td className="py-3 text-gray-300">
                      {formatearStock(b.stock, b.producto.unidades_por_bulto)}
                      <span className="block text-gray-600 text-xs">mínimo {b.minimo} u</span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {b.enCamino > 0
                        ? formatearStock(b.enCamino, b.producto.unidades_por_bulto)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
