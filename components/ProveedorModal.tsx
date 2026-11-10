'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parsearPrecio } from '@/lib/proveedores'
import type { Proveedor } from '@/lib/proveedores'

type Props = {
  proveedor: Proveedor | null
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function ProveedorModal({ proveedor, onCerrar }: Props) {
  const router = useRouter()
  const editando = proveedor !== null

  const [nombre, setNombre] = useState(proveedor?.nombre ?? '')
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? '')
  const [email, setEmail] = useState(proveedor?.email ?? '')
  const [notas, setNotas] = useState(proveedor?.notas ?? '')
  const [activo, setActivo] = useState(proveedor?.activo ?? true)
  const [plazo, setPlazo] = useState(
    proveedor?.plazo_entrega_dias !== null && proveedor?.plazo_entrega_dias !== undefined
      ? String(proveedor.plazo_entrega_dias)
      : ''
  )
  const [montoMinimo, setMontoMinimo] = useState(
    proveedor?.monto_minimo !== null && proveedor?.monto_minimo !== undefined
      ? String(proveedor.monto_minimo).replace('.', ',')
      : ''
  )
  const [cuit, setCuit] = useState(proveedor?.cuit ?? '')
  const [condicionPago, setCondicionPago] = useState(proveedor?.condicion_pago ?? '')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    let plazoDias: number | null = null
    if (plazo.trim() !== '') {
      plazoDias = Number(plazo)
      if (!Number.isInteger(plazoDias) || plazoDias < 0) {
        setErrorMsg('El plazo de entrega tiene que ser un número entero de días (0 o más)')
        return
      }
    }

    let minimo: number | null = null
    if (montoMinimo.trim() !== '') {
      minimo = parsearPrecio(montoMinimo)
      if (minimo === null) {
        setErrorMsg('No se entiende el monto mínimo de compra')
        return
      }
    }

    setGuardando(true)

    const supabase = createClient()
    const datos = {
      p_nombre: nombre,
      p_telefono: telefono,
      p_email: email,
      p_notas: notas,
      p_plazo_entrega_dias: plazoDias,
      p_monto_minimo: minimo,
      p_cuit: cuit,
      p_condicion_pago: condicionPago,
    }

    const { error } = proveedor
      ? await supabase.rpc('editar_proveedor', {
          p_id: proveedor.id,
          ...datos,
          p_activo: activo,
        })
      : await supabase.rpc('crear_proveedor', datos)

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
        <h2 className="text-xl font-bold text-white mb-4">
          {editando ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h2>

        <label className="block text-gray-400 text-sm mb-1">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">
          Teléfono (opcional)
        </label>
        <input
          type="text"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">
          Email (opcional)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">
          Plazo de entrega en días (opcional)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={plazo}
          onChange={(e) => setPlazo(e.target.value)}
          placeholder="Ej: 7"
          className={inputClass}
        />
        <p className="text-gray-600 text-xs mb-4 mt-1">
          Con esto, al armar un pedido la fecha estimada de llegada se completa sola.
        </p>

        <label className="block text-gray-400 text-sm mb-1">
          Monto mínimo de compra en pesos (opcional)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={montoMinimo}
          onChange={(e) => setMontoMinimo(e.target.value)}
          placeholder="Ej: 150.000"
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">CUIT (opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          placeholder="Ej: 30-12345678-9"
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">
          Condición de pago (opcional)
        </label>
        <input
          type="text"
          value={condicionPago}
          onChange={(e) => setCondicionPago(e.target.value)}
          placeholder="Ej: Contado, 30 días, transferencia"
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">
          Notas (opcional)
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          className={`${inputClass} mb-4`}
        />

        {editando && (
          <label className="flex items-center gap-2 text-gray-300 text-sm mb-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Proveedor activo
          </label>
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
