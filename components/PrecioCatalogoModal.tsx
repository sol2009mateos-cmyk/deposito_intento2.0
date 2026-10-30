'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearPesos, parsearPrecio } from '@/lib/proveedores'
import type { ItemCatalogo, Proveedor } from '@/lib/proveedores'
import type { Producto } from '@/lib/stock'

type Props = {
  proveedor: Proveedor
  // Productos que todavía no están en el catálogo de ningún proveedor.
  disponibles: Producto[]
  // Si se está cambiando el precio de un producto que ya está en el catálogo.
  editar: { item: ItemCatalogo; producto: Producto } | null
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function PrecioCatalogoModal({
  proveedor,
  disponibles,
  editar,
  onCerrar,
}: Props) {
  const router = useRouter()

  const [busqueda, setBusqueda] = useState('')
  const [productoId, setProductoId] = useState(editar?.producto.id ?? '')
  const [precioTexto, setPrecioTexto] = useState(
    editar ? String(editar.item.precio).replace('.', ',') : ''
  )
  const [porBulto, setPorBulto] = useState(editar?.item.por_bulto ?? false)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (texto === '') return disponibles
    return disponibles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.codigo ?? '').toLowerCase().includes(texto)
    )
  }, [disponibles, busqueda])

  const producto: Producto | null = editar
    ? editar.producto
    : disponibles.find((p) => p.id === productoId) ?? null

  const usaBultos = (producto?.unidades_por_bulto ?? 1) > 1
  const precio = parsearPrecio(precioTexto)

  let aclaracion = ''
  if (producto && precio !== null && usaBultos) {
    if (porBulto) {
      aclaracion = `Equivale a ${formatearPesos(
        precio / producto.unidades_por_bulto
      )} por unidad.`
    } else {
      aclaracion = `Equivale a ${formatearPesos(
        precio * producto.unidades_por_bulto
      )} por bulto de ${producto.unidades_por_bulto} unidades.`
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!producto) {
      setErrorMsg('Elegí un producto')
      return
    }
    if (precio === null || precio <= 0) {
      setErrorMsg('Escribí un precio mayor a cero')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('guardar_precio_catalogo', {
      p_proveedor_id: proveedor.id,
      p_producto_id: producto.id,
      p_precio: precio,
      p_por_bulto: usaBultos ? porBulto : false,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={guardar}
        className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-white">
          {editar ? 'Cambiar precio' : 'Agregar al catálogo'}
        </h2>
        <p className="text-gray-500 text-sm mt-1 mb-4">{proveedor.nombre}</p>

        {editar ? (
          <p className="text-gray-200 text-sm mb-4">{editar.producto.nombre}</p>
        ) : (
          <>
            <label className="block text-gray-400 text-sm mb-1">Producto</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código"
              className={`${inputClass} mb-2`}
            />
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
              className={`${inputClass} mb-4`}
            >
              <option value="">
                {filtrados.length === 0
                  ? 'No hay productos disponibles'
                  : 'Elegí un producto'}
              </option>
              {filtrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.codigo ? ` (${p.codigo})` : ''}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="block text-gray-400 text-sm mb-1">Precio en pesos</label>
        <input
          type="text"
          inputMode="decimal"
          value={precioTexto}
          onChange={(e) => setPrecioTexto(e.target.value)}
          placeholder="Ej: 1500 o 1.500,50"
          required
          className={`${inputClass} mb-4`}
        />

        {usaBultos && (
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Ese precio es:</p>
            <label className="flex items-center gap-2 text-gray-300 text-sm mb-1">
              <input
                type="radio"
                checked={!porBulto}
                onChange={() => setPorBulto(false)}
              />
              Por unidad
            </label>
            <label className="flex items-center gap-2 text-gray-300 text-sm">
              <input
                type="radio"
                checked={porBulto}
                onChange={() => setPorBulto(true)}
              />
              Por bulto
            </label>
          </div>
        )}

        {aclaracion && (
          <p className="text-gray-400 text-xs mb-4">{aclaracion}</p>
        )}

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
            type="submit"
            disabled={guardando}
            className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
