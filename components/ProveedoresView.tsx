'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProveedorModal from '@/components/ProveedorModal'
import PrecioCatalogoModal from '@/components/PrecioCatalogoModal'
import ImportarCatalogoModal from '@/components/ImportarCatalogoModal'
import HistorialPreciosModal from '@/components/HistorialPreciosModal'
import { formatearPesos } from '@/lib/proveedores'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import { formatearVariacion, variacionPorcentaje } from '@/lib/precios'
import type { CambioPrecio } from '@/lib/precios'
import { formatearFechaHoraPedido } from '@/lib/pedidos'
import type { Producto } from '@/lib/stock'

type Props = {
  proveedores: Proveedor[]
  catalogo: ItemCatalogo[]
  productos: Producto[]
  // Historial de precios, del cambio más nuevo al más viejo.
  historial: CambioPrecio[]
}

export default function ProveedoresView({ proveedores, catalogo, productos, historial }: Props) {
  const router = useRouter()

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    proveedores[0]?.id ?? null
  )
  const [modalProveedor, setModalProveedor] = useState<{
    proveedor: Proveedor | null
  } | null>(null)
  const [modalPrecio, setModalPrecio] = useState<{
    editar: { item: ItemCatalogo; producto: Producto } | null
  } | null>(null)
  const [importando, setImportando] = useState(false)
  const [verHistorial, setVerHistorial] = useState<Producto | null>(null)
  const [quitandoId, setQuitandoId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  const cantidadPorProveedor = useMemo(() => {
    const mapa = new Map<string, number>()
    catalogo.forEach((i) =>
      mapa.set(i.proveedor_id, (mapa.get(i.proveedor_id) ?? 0) + 1)
    )
    return mapa
  }, [catalogo])

  // Cambios de precio por producto (ya vienen del más nuevo al más viejo).
  const cambiosPorProducto = useMemo(() => {
    const mapa = new Map<string, CambioPrecio[]>()
    historial.forEach((c) => {
      const lista = mapa.get(c.producto_id) ?? []
      lista.push(c)
      mapa.set(c.producto_id, lista)
    })
    return mapa
  }, [historial])

  // Productos activos que todavía no están en el catálogo de ningún proveedor.
  const disponibles = useMemo(() => {
    const enCatalogo = new Set(catalogo.map((i) => i.producto_id))
    return productos.filter((p) => p.activo && !enCatalogo.has(p.id))
  }, [productos, catalogo])

  const proveedor = proveedores.find((p) => p.id === seleccionadoId) ?? null

  const filas = useMemo(() => {
    if (!proveedor) return []
    return catalogo
      .filter((i) => i.proveedor_id === proveedor.id)
      .map((item) => ({ item, producto: productoPorId.get(item.producto_id) }))
      .filter(
        (f): f is { item: ItemCatalogo; producto: Producto } =>
          f.producto !== undefined
      )
      .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
  }, [catalogo, proveedor, productoPorId])

  async function quitar(producto: Producto) {
    if (!window.confirm(`¿Quitar "${producto.nombre}" del catálogo de este proveedor?`)) {
      return
    }

    setErrorMsg('')
    setQuitandoId(producto.id)

    const supabase = createClient()
    const { error } = await supabase.rpc('quitar_del_catalogo', {
      p_producto_id: producto.id,
    })

    setQuitandoId(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🚚 Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            Cada producto pertenece al catálogo de un solo proveedor.
          </p>
        </div>
        <button
          onClick={() => setModalProveedor({ proveedor: null })}
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
        >
          ＋ Nuevo proveedor
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-[#161922] rounded-lg p-6">
          <p className="text-gray-500 text-sm">
            Todavía no hay proveedores. Creá el primero con &quot;Nuevo proveedor&quot;.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="bg-[#161922] rounded-lg p-2 w-full lg:w-72 shrink-0">
            {proveedores.map((p) => {
              const activoSel = p.id === seleccionadoId
              const cantidad = cantidadPorProveedor.get(p.id) ?? 0
              return (
                <button
                  key={p.id}
                  onClick={() => setSeleccionadoId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                    activoSel
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="block font-medium">
                    {p.nombre}
                    {!p.activo && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                        Inactivo
                      </span>
                    )}
                  </span>
                  <span
                    className={`block text-xs ${
                      activoSel ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {cantidad} {cantidad === 1 ? 'producto' : 'productos'}
                  </span>
                </button>
              )
            })}
          </div>

          {proveedor && (
            <div className="bg-[#161922] rounded-lg p-4 flex-1 w-full overflow-x-auto">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{proveedor.nombre}</h2>
                  {proveedor.telefono && (
                    <p className="text-gray-400 text-sm">Tel: {proveedor.telefono}</p>
                  )}
                  {proveedor.email && (
                    <p className="text-gray-400 text-sm">{proveedor.email}</p>
                  )}
                  {proveedor.cuit && (
                    <p className="text-gray-400 text-sm">CUIT: {proveedor.cuit}</p>
                  )}
                  {proveedor.plazo_entrega_dias !== null && (
                    <p className="text-gray-400 text-sm">
                      Plazo de entrega: {proveedor.plazo_entrega_dias}{' '}
                      {proveedor.plazo_entrega_dias === 1 ? 'día' : 'días'}
                    </p>
                  )}
                  {proveedor.monto_minimo !== null && (
                    <p className="text-gray-400 text-sm">
                      Compra mínima: {formatearPesos(proveedor.monto_minimo)}
                    </p>
                  )}
                  {proveedor.condicion_pago && (
                    <p className="text-gray-400 text-sm">
                      Condición de pago: {proveedor.condicion_pago}
                    </p>
                  )}
                  {proveedor.notas && (
                    <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">
                      {proveedor.notas}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setModalProveedor({ proveedor })}
                    className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    Editar proveedor
                  </button>
                  <button
                    onClick={() => setModalPrecio({ editar: null })}
                    disabled={!proveedor.activo}
                    className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    ＋ Agregar producto
                  </button>
                  <button
                    onClick={() => setImportando(true)}
                    disabled={!proveedor.activo}
                    className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    Importar desde Excel
                  </button>
                </div>
              </div>

              {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}

              {filas.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">
                  Este proveedor todavía no tiene productos en el catálogo.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2">Precio cargado</th>
                      <th className="pb-2">Precio por unidad</th>
                      <th className="pb-2 text-right">Acciones</th>
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
                          {producto.unidades_por_bulto > 1 && (
                            <span className="block text-gray-500 text-xs">
                              Bulto de {producto.unidades_por_bulto} u
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatearPesos(item.precio)}{' '}
                          <span className="text-gray-500 text-xs">
                            {item.por_bulto ? 'por bulto' : 'por unidad'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatearPesos(item.precio_unidad)}
                          {(() => {
                            const ultimo = cambiosPorProducto.get(producto.id)?.[0]
                            if (!ultimo || ultimo.precio_unidad_anterior === null) return null
                            const variacion = variacionPorcentaje(
                              ultimo.precio_unidad_anterior,
                              ultimo.precio_unidad
                            )
                            if (variacion === null || Math.abs(variacion) < 0.05) return null
                            return (
                              <span
                                className={`block text-xs ${
                                  variacion > 0 ? 'text-red-400' : 'text-green-400'
                                }`}
                              >
                                {formatearVariacion(variacion)} ·{' '}
                                {formatearFechaHoraPedido(ultimo.cambiado_en).slice(0, 10)}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setVerHistorial(producto)}
                              className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-2 py-1.5 rounded-lg"
                            >
                              Historial
                            </button>
                            <button
                              onClick={() =>
                                setModalPrecio({ editar: { item, producto } })
                              }
                              className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-2 py-1.5 rounded-lg"
                            >
                              Cambiar precio
                            </button>
                            <button
                              onClick={() => quitar(producto)}
                              disabled={quitandoId === producto.id}
                              className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-50 text-red-400 px-2 py-1.5 rounded-lg"
                            >
                              {quitandoId === producto.id ? '...' : 'Quitar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {modalProveedor && (
        <ProveedorModal
          proveedor={modalProveedor.proveedor}
          onCerrar={() => setModalProveedor(null)}
        />
      )}

      {modalPrecio && proveedor && (
        <PrecioCatalogoModal
          proveedor={proveedor}
          disponibles={disponibles}
          editar={modalPrecio.editar}
          onCerrar={() => setModalPrecio(null)}
        />
      )}

      {verHistorial && (
        <HistorialPreciosModal
          producto={verHistorial}
          cambios={cambiosPorProducto.get(verHistorial.id) ?? []}
          onCerrar={() => setVerHistorial(null)}
        />
      )}

      {importando && proveedor && (
        <ImportarCatalogoModal
          proveedor={proveedor}
          onCerrar={() => setImportando(false)}
        />
      )}
    </div>
  )
}
