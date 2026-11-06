'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aUnidades } from '@/lib/recepcion'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import type { Lote, Producto } from '@/lib/stock'

type Props = {
  producto: Producto
  lote: Lote
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function AjusteModal({ producto, lote, onCerrar }: Props) {
  const router = useRouter()
  const porBulto = producto.unidades_por_bulto
  const usaBultos = porBulto > 1

  // Se arranca con la cantidad que figura en el sistema.
  const [bultos, setBultos] = useState(
    usaBultos ? String(Math.floor(lote.cantidad_actual / porBulto)) : ''
  )
  const [sueltas, setSueltas] = useState(
    String(usaBultos ? lote.cantidad_actual % porBulto : lote.cantidad_actual)
  )
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const real = aUnidades(usaBultos ? bultos : '', sueltas, porBulto)
  const diferencia = real - lote.cantidad_actual

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (diferencia === 0) {
      setErrorMsg('La cantidad real es igual a la que figura en el sistema')
      return
    }
    if (motivo.trim() === '') {
      setErrorMsg('Escribí el motivo del ajuste')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('ajustar_lote', {
      p_lote_id: lote.id,
      p_cantidad_real: real,
      p_motivo: motivo,
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
        <h2 className="text-xl font-bold text-white">Ajustar lote</h2>
        <p className="text-gray-400 text-sm mt-1">{producto.nombre}</p>
        <p className="text-gray-600 text-xs mb-4">
          Lote {lote.nro_lote ?? 'sin número'} ·{' '}
          {lote.vencimiento
            ? `vence ${formatearVencimiento(lote.vencimiento)}`
            : 'sin vencimiento'}
        </p>

        <p className="text-gray-300 text-sm mb-4">
          En el sistema figura: {formatearStock(lote.cantidad_actual, porBulto)}
        </p>

        <p className="text-gray-400 text-sm mb-2">Cantidad real que contaste:</p>

        {usaBultos && (
          <>
            <label className="block text-gray-500 text-xs mb-1">
              Bultos (1 bulto = {porBulto} u)
            </label>
            <input
              type="number"
              min={0}
              value={bultos}
              onChange={(e) => setBultos(e.target.value)}
              className={`${inputClass} mb-3`}
            />
          </>
        )}

        <label className="block text-gray-500 text-xs mb-1">
          {usaBultos ? 'Unidades sueltas' : 'Unidades'}
        </label>
        <input
          type="number"
          min={0}
          value={sueltas}
          onChange={(e) => setSueltas(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <p
          className={`text-sm mb-4 ${
            diferencia === 0
              ? 'text-gray-500'
              : diferencia > 0
                ? 'text-green-400'
                : 'text-red-400'
          }`}
        >
          {diferencia === 0
            ? 'Sin diferencia'
            : `Diferencia: ${diferencia > 0 ? '+' : '−'}${formatearStock(
                Math.abs(diferencia),
                porBulto
              )}`}
        </p>

        <label className="block text-gray-400 text-sm mb-1">Motivo del ajuste</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Ej: conteo físico, error de carga"
          required
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
            {guardando ? 'Guardando...' : 'Guardar ajuste'}
          </button>
        </div>
      </form>
    </div>
  )
}
