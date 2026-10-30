'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearNumeroPedido } from '@/lib/pedidos'
import type { ItemPedido, Pedido } from '@/lib/pedidos'
import { formatearPesos, parsearPrecio } from '@/lib/proveedores'
import type { ItemCatalogo } from '@/lib/proveedores'
import { formatearStock } from '@/lib/stock'
import type { Producto } from '@/lib/stock'

// Un producto del catálogo del proveedor que todavía no está en el pedido.
export type DisponibleCatalogo = {
  producto: Producto
  catalogo: ItemCatalogo
}

type Props = {
  pedido: Pedido
  disponibles: DisponibleCatalogo[]
  // Si se está cambiando una línea que ya está en el pedido.
  editar: { item: ItemPedido; producto: Producto } | null
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

function aTexto(numero: number): string {
  return String(numero).replace('.', ',')
}

export default function ItemPedidoModal({ pedido, disponibles, editar, onCerrar }: Props) {
  const router = useRouter()

  // Valores iniciales cuando se edita una línea ya cargada.
  const porBultoEditar = editar ? editar.producto.unidades_por_bulto : 1
  const enBultosEditar =
    editar !== null &&
    porBultoEditar > 1 &&
    editar.item.cantidad % porBultoEditar === 0

  const [busqueda, setBusqueda] = useState('')
  const [productoId, setProductoId] = useState(editar?.producto.id ?? '')
  const [cantidadTexto, setCantidadTexto] = useState(
    editar
      ? String(enBultosEditar ? editar.item.cantidad / porBultoEditar : editar.item.cantidad)
      : ''
  )
  const [enBultos, setEnBultos] = useState(enBultosEditar)
  const [precioTexto, setPrecioTexto] = useState(
    editar
      ? porBultoEditar > 1
        ? aTexto(Number((editar.item.precio_unidad * porBultoEditar).toFixed(2)))
        : aTexto(editar.item.precio_unidad)
      : ''
  )
  const [precioPorBulto, setPrecioPorBulto] = useState(editar ? porBultoEditar > 1 : false)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (texto === '') return disponibles
    return disponibles.filter(
      (d) =>
        d.producto.nombre.toLowerCase().includes(texto) ||
        (d.producto.codigo ?? '').toLowerCase().includes(texto)
    )
  }, [disponibles, busqueda])

  const elegido = editar ? null : disponibles.find((d) => d.producto.id === productoId) ?? null
  const producto: Producto | null = editar ? editar.producto : elegido?.producto ?? null

  const porBulto = producto?.unidades_por_bulto ?? 1
  const usaBultos = porBulto > 1

  // Al elegir un producto nuevo se carga solo el precio del catálogo, que se puede cambiar.
  function elegirProducto(id: string) {
    setProductoId(id)
    const d = disponibles.find((x) => x.producto.id === id)
    if (!d) return
    setPrecioTexto(aTexto(d.catalogo.precio))
    setPrecioPorBulto(d.catalogo.por_bulto)
    setEnBultos(d.producto.unidades_por_bulto > 1)
  }

  const cantidad = parseInt(cantidadTexto, 10)
  const precio = parsearPrecio(precioTexto)
  const cantidadValida = !Number.isNaN(cantidad) && cantidad > 0

  const totalUnidades = cantidadValida ? cantidad * (usaBultos && enBultos ? porBulto : 1) : 0
  const precioUnidad =
    precio !== null ? (usaBultos && precioPorBulto ? precio / porBulto : precio) : null
  const subtotal = precioUnidad !== null ? totalUnidades * precioUnidad : null

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!producto) {
      setErrorMsg('Elegí un producto')
      return
    }
    if (!cantidadValida) {
      setErrorMsg('Escribí una cantidad mayor a cero')
      return
    }
    if (precio === null || precio <= 0) {
      setErrorMsg('Escribí un precio mayor a cero')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('guardar_item_pedido', {
      p_pedido_id: pedido.id,
      p_producto_id: producto.id,
      p_cantidad: cantidad,
      p_en_bultos: usaBultos && enBultos,
      p_precio: precio,
      p_precio_por_bulto: usaBultos && precioPorBulto,
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
          {editar ? 'Cambiar producto del pedido' : 'Agregar producto al pedido'}
        </h2>
        <p className="text-gray-500 text-sm mt-1 mb-4">
          {formatearNumeroPedido(pedido.numero)}
        </p>

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
              onChange={(e) => elegirProducto(e.target.value)}
              required
              className={`${inputClass} mb-4`}
            >
              <option value="">
                {filtrados.length === 0
                  ? 'No hay productos disponibles del catálogo'
                  : 'Elegí un producto'}
              </option>
              {filtrados.map((d) => (
                <option key={d.producto.id} value={d.producto.id}>
                  {d.producto.nombre}
                  {d.producto.codigo ? ` (${d.producto.codigo})` : ''}
                </option>
              ))}
            </select>
          </>
        )}

        {usaBultos && (
          <p className="text-gray-600 text-xs mb-3">1 bulto = {porBulto} unidades</p>
        )}

        <label className="block text-gray-400 text-sm mb-1">Cantidad</label>
        <input
          type="number"
          min={1}
          value={cantidadTexto}
          onChange={(e) => setCantidadTexto(e.target.value)}
          required
          className={`${inputClass} mb-2`}
        />

        {usaBultos && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-gray-300 text-sm mb-1">
              <input
                type="radio"
                checked={enBultos}
                onChange={() => setEnBultos(true)}
              />
              Bultos
            </label>
            <label className="flex items-center gap-2 text-gray-300 text-sm">
              <input
                type="radio"
                checked={!enBultos}
                onChange={() => setEnBultos(false)}
              />
              Unidades
            </label>
          </div>
        )}
        {!usaBultos && <div className="mb-2" />}

        <label className="block text-gray-400 text-sm mb-1">Precio en pesos</label>
        <input
          type="text"
          inputMode="decimal"
          value={precioTexto}
          onChange={(e) => setPrecioTexto(e.target.value)}
          placeholder="Ej: 1500 o 1.500,50"
          required
          className={`${inputClass} mb-2`}
        />

        {usaBultos && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-gray-300 text-sm mb-1">
              <input
                type="radio"
                checked={!precioPorBulto}
                onChange={() => setPrecioPorBulto(false)}
              />
              Precio por unidad
            </label>
            <label className="flex items-center gap-2 text-gray-300 text-sm">
              <input
                type="radio"
                checked={precioPorBulto}
                onChange={() => setPrecioPorBulto(true)}
              />
              Precio por bulto
            </label>
          </div>
        )}

        {producto && totalUnidades > 0 && subtotal !== null && (
          <p className="text-gray-300 text-sm mb-4">
            Se piden {formatearStock(totalUnidades, porBulto)}. Subtotal:{' '}
            {formatearPesos(subtotal)}
          </p>
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
