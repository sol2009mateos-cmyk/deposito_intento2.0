'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearNumeroPedido } from '@/lib/pedidos'
import type { Recepcion } from '@/lib/recepcion'

type Props = {
  recepcion: Recepcion
  onCerrar: () => void
}

export default function AnularRecepcionModal({ recepcion, onCerrar }: Props) {
  const router = useRouter()

  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function anular(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (motivo.trim() === '') {
      setErrorMsg('Escribí el motivo de la anulación')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('anular_recepcion', {
      p_recepcion_id: recepcion.id,
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
        onSubmit={anular}
        className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-white">Anular recepción</h2>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          {formatearNumeroPedido(recepcion.pedido_numero)} · {recepcion.proveedor_nombre}
        </p>

        <p className="text-gray-300 text-sm mb-2">Al anularla:</p>
        <ul className="text-gray-400 text-xs list-disc ml-5 mb-4">
          <li>Se descuenta del stock todo lo que entró en esta recepción.</li>
          <li>El pedido vuelve a &quot;Pendiente de recibir&quot; para recibirlo de nuevo, bien cargado.</li>
          <li>Esta recepción queda en el historial como anulada.</li>
          <li>
            Si ya salió mercadería de alguno de sus lotes, no se puede anular: en ese caso
            corregí con un ajuste.
          </li>
        </ul>

        <label className="block text-gray-400 text-sm mb-1">Motivo de la anulación</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ej: error al cargar el vencimiento"
          required
          className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 mb-4"
        />

        {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCerrar}
            className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {guardando ? 'Anulando...' : 'Anular recepción'}
          </button>
        </div>
      </form>
    </div>
  )
}
