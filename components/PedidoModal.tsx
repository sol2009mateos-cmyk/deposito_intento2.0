'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearNumeroPedido } from '@/lib/pedidos'
import type { Pedido } from '@/lib/pedidos'
import { fechaEstimadaPorPlazo, formatearPesos } from '@/lib/proveedores'
import type { Proveedor } from '@/lib/proveedores'

type Props = {
  proveedores: Proveedor[]
  // null = pedido nuevo; con un pedido = editar fecha estimada y notas.
  pedido: Pedido | null
  onCreado: (pedidoId: string) => void
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function PedidoModal({ proveedores, pedido, onCreado, onCerrar }: Props) {
  const router = useRouter()
  const editando = pedido !== null

  const [proveedorId, setProveedorId] = useState(pedido?.proveedor_id ?? '')
  const [fechaEstimada, setFechaEstimada] = useState(pedido?.fecha_estimada ?? '')
  const [notas, setNotas] = useState(pedido?.notas ?? '')
  // Si la fecha la tocó la persona, no se pisa al cambiar de proveedor.
  const [fechaTocada, setFechaTocada] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const activos = proveedores.filter((p) => p.activo)
  const proveedorActual = proveedores.find((p) => p.id === proveedorId) ?? null

  function elegirProveedor(id: string) {
    setProveedorId(id)
    if (!fechaTocada) {
      const elegido = proveedores.find((p) => p.id === id)
      setFechaEstimada(fechaEstimadaPorPlazo(elegido?.plazo_entrega_dias ?? null))
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!editando && proveedorId === '') {
      setErrorMsg('Elegí un proveedor')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const fecha = fechaEstimada === '' ? null : fechaEstimada

    if (pedido) {
      const { error } = await supabase.rpc('editar_pedido', {
        p_id: pedido.id,
        p_fecha_estimada: fecha,
        p_notas: notas,
      })

      setGuardando(false)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      router.refresh()
      onCerrar()
      return
    }

    const { data, error } = await supabase.rpc('crear_pedido', {
      p_proveedor_id: proveedorId,
      p_fecha_estimada: fecha,
      p_notas: notas,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.refresh()
    onCreado(data as string)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={guardar}
        className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-white mb-4">
          {pedido ? `Editar ${formatearNumeroPedido(pedido.numero)}` : 'Nuevo pedido'}
        </h2>

        <label className="block text-gray-400 text-sm mb-1">Proveedor</label>
        {editando ? (
          <p className="text-gray-200 text-sm mb-4">
            {proveedorActual?.nombre ?? '—'}
          </p>
        ) : (
          <select
            value={proveedorId}
            onChange={(e) => elegirProveedor(e.target.value)}
            required
            className={`${inputClass} mb-4`}
          >
            <option value="">
              {activos.length === 0
                ? 'No hay proveedores activos'
                : 'Elegí un proveedor'}
            </option>
            {activos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}

        {!editando && proveedorActual && (
          <div className="text-gray-500 text-xs mb-4 -mt-2">
            {proveedorActual.plazo_entrega_dias !== null && (
              <p>
                Plazo de entrega: {proveedorActual.plazo_entrega_dias}{' '}
                {proveedorActual.plazo_entrega_dias === 1 ? 'día' : 'días'}
              </p>
            )}
            {proveedorActual.monto_minimo !== null && (
              <p>Compra mínima: {formatearPesos(proveedorActual.monto_minimo)}</p>
            )}
            {proveedorActual.condicion_pago && (
              <p>Condición de pago: {proveedorActual.condicion_pago}</p>
            )}
          </div>
        )}

        <label className="block text-gray-400 text-sm mb-1">
          Fecha estimada de llegada (opcional)
        </label>
        <input
          type="date"
          value={fechaEstimada}
          onChange={(e) => {
            setFechaTocada(true)
            setFechaEstimada(e.target.value)
          }}
          className={`${inputClass} mb-1`}
        />
        {!editando && (
          <p className="text-gray-600 text-xs mb-4">
            Si la dejás vacía, se calcula con el plazo del proveedor (si tiene uno cargado).
          </p>
        )}
        {editando && <div className="mb-3" />}

        <label className="block text-gray-400 text-sm mb-1">
          Notas (opcional)
        </label>
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
            type="submit"
            disabled={guardando}
            className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {guardando ? 'Guardando...' : editando ? 'Guardar' : 'Crear pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}
