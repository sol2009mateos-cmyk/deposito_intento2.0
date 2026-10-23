'use client'

import { Fragment, useMemo, useState } from 'react'
import ProductoModal from '@/components/ProductoModal'
import CargaInicialModal from '@/components/CargaInicialModal'
import {
  formatearStock,
  formatearVencimiento,
  type Categoria,
  type Lote,
  type Producto,
} from '@/lib/stock'

type Props = {
  categorias: Categoria[]
  productos: Producto[]
  lotes: Lote[]
  puedeEditar: boolean
}

// Ordena los lotes por vencimiento: primero el que vence antes, sin vencimiento al final.
function porVencimiento(a: Lote, b: Lote) {
  if (a.vencimiento === b.vencimiento) return 0
  if (a.vencimiento === null) return 1
  if (b.vencimiento === null) return -1
  return a.vencimiento.localeCompare(b.vencimiento)
}

export default function InventarioView({
  categorias,
  productos,
  lotes,
  puedeEditar,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modalProducto, setModalProducto] = useState<{
    producto: Producto | null
  } | null>(null)
  const [cargaProducto, setCargaProducto] = useState<Producto | null>(null)

  const nombreCategoria = useMemo(() => {
    const mapa = new Map<string, string>()
    categorias.forEach((c) => mapa.set(c.id, c.nombre))
    return mapa
  }, [categorias])

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return productos
      .filter((p) => mostrarInactivos || p.activo)
      .filter((p) => categoriaFiltro === '' || p.categoria_id === categoriaFiltro)
      .filter(
        (p) =>
          texto === '' ||
          p.nombre.toLowerCase().includes(texto) ||
          (p.codigo ?? '').toLowerCase().includes(texto)
      )
      .map((p) => {
        const lotesProducto = lotes
          .filter((l) => l.producto_id === p.id && l.cantidad_actual > 0)
          .sort(porVencimiento)
        const total = lotesProducto.reduce((suma, l) => suma + l.cantidad_actual, 0)
        const proximo = lotesProducto.find((l) => l.vencimiento)?.vencimiento ?? null
        return { producto: p, lotes: lotesProducto, total, proximo }
      })
  }, [productos, lotes, busqueda, categoriaFiltro, mostrarInactivos])

  const columnas = puedeEditar ? 5 : 4

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">
            El stock se muestra en bultos y unidades. Tocá un producto para ver sus lotes.
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setModalProducto({ producto: null })}
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
          >
            ＋ Nuevo producto
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código"
          className="bg-[#161922] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 w-64"
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="bg-[#161922] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-gray-400 text-sm">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
        {filas.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            {productos.length === 0
              ? puedeEditar
                ? 'Todavía no hay productos. Creá el primero con "Nuevo producto".'
                : 'Todavía no hay productos cargados.'
              : 'No hay productos que coincidan con la búsqueda.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2">Producto</th>
                <th className="pb-2">Categoría</th>
                <th className="pb-2">Stock</th>
                <th className="pb-2">Próx. vencimiento</th>
                {puedeEditar && <th className="pb-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ producto: p, lotes: lotesProducto, total, proximo }) => (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                    className="border-b border-gray-800 cursor-pointer hover:bg-gray-800/40"
                  >
                    <td className="py-3">
                      <span className="text-gray-200">{p.nombre}</span>
                      {!p.activo && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                          Inactivo
                        </span>
                      )}
                      {p.codigo && (
                        <span className="block text-gray-600 text-xs">{p.codigo}</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400">
                      {nombreCategoria.get(p.categoria_id) ?? '—'}
                    </td>
                    <td className="py-3 text-gray-200">
                      {formatearStock(total, p.unidades_por_bulto)}
                    </td>
                    <td className="py-3 text-gray-400">
                      {p.tiene_vencimiento ? formatearVencimiento(proximo) : 'Sin vencimiento'}
                    </td>
                    {puedeEditar && (
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCargaProducto(p)
                            }}
                            disabled={!p.activo}
                            className="text-xs bg-[#0f1117] hover:bg-gray-800 disabled:opacity-40 text-gray-300 px-2 py-1.5 rounded-lg"
                          >
                            Cargar stock
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setModalProducto({ producto: p })
                            }}
                            className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-2 py-1.5 rounded-lg"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {expandido === p.id && (
                    <tr className="border-b border-gray-800 bg-[#0f1117]">
                      <td colSpan={columnas} className="py-3 px-4">
                        {lotesProducto.length === 0 ? (
                          <p className="text-gray-500 text-xs">
                            Este producto no tiene stock cargado.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {lotesProducto.map((l) => (
                              <p key={l.id} className="text-gray-400 text-xs">
                                Lote {l.nro_lote ?? 'sin número'} ·{' '}
                                {p.tiene_vencimiento
                                  ? `Vence ${formatearVencimiento(l.vencimiento)}`
                                  : 'Sin vencimiento'}{' '}
                                · {formatearStock(l.cantidad_actual, p.unidades_por_bulto)}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalProducto && (
        <ProductoModal
          categorias={categorias}
          producto={modalProducto.producto}
          onCerrar={() => setModalProducto(null)}
        />
      )}

      {cargaProducto && (
        <CargaInicialModal
          producto={cargaProducto}
          onCerrar={() => setCargaProducto(null)}
        />
      )}
    </div>
  )
}
