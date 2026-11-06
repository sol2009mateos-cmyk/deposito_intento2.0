'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NOMBRE_ESTADO, formatearNumeroPedido } from '@/lib/pedidos'
import type { Pedido } from '@/lib/pedidos'

type Props = {
  pedido: Pedido
  onCerrar: () => void
}

export default function CancelarPedidoModal({ pedido, onCerrar }: Props) {
  const router = useRouter()

  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function cancelar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (motivo.trim() === '') {
      setErrorMsg('Escribí el motivo de la cancelación')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('cancelar_pedido', {
      p_id: pedido.id,
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
        onSubmit={cancelar}
        className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-white">Cancelar pedido</h2>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          {formatearNumeroPedido(pedido.numero)} · {NOMBRE_ESTADO[pedido.estado]}
        </p>

        <label className="block text-gray-400 text-sm mb-1">
          Motivo de la cancelación
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ej: el proveedor no tiene stock, pedido duplicado"
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
            {guardando ? 'Cancelando...' : 'Cancelar pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}
