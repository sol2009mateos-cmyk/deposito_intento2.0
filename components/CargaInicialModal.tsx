'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatearStock, type Producto } from '@/lib/stock'

type Props = {
  producto: Producto
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function CargaInicialModal({ producto, onCerrar }: Props) {
  const router = useRouter()
  const usaBultos = producto.unidades_por_bulto > 1

  const [bultos, setBultos] = useState('')
  const [unidades, setUnidades] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [nroLote, setNroLote] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const numBultos = usaBultos ? parseInt(bultos, 10) || 0 : 0
  const numUnidades = parseInt(unidades, 10) || 0
  const total = numBultos * producto.unidades_por_bulto + numUnidades

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (total <= 0) {
      setErrorMsg('Cargá una cantidad mayor a cero')
      return
    }
    if (producto.tiene_vencimiento && vencimiento === '') {
      setErrorMsg('Elegí el mes y año de vencimiento')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('carga_inicial', {
      p_producto_id: producto.id,
      p_bultos: numBultos,
      p_unidades: numUnidades,
      p_vencimiento: producto.tiene_vencimiento ? `${vencimiento}-01` : null,
      p_nro_lote: nroLote.trim() === '' ? null : nroLote.trim(),
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
        <h2 className="text-xl font-bold text-white">Carga inicial</h2>
        <p className="text-gray-400 text-sm mt-1">{producto.nombre}</p>
        {usaBultos && (
          <p className="text-gray-600 text-xs mb-4">
            1 bulto = {producto.unidades_por_bulto} unidades
          </p>
        )}
        {!usaBultos && <div className="mb-4" />}

        {usaBultos && (
          <>
            <label className="block text-gray-400 text-sm mb-1">Bultos</label>
            <input
              type="number"
              min={0}
              value={bultos}
              onChange={(e) => setBultos(e.target.value)}
              className={`${inputClass} mb-4`}
            />
          </>
        )}

        <label className="block text-gray-400 text-sm mb-1">
          {usaBultos ? 'Unidades sueltas' : 'Unidades'}
        </label>
        <input
          type="number"
          min={0}
          value={unidades}
          onChange={(e) => setUnidades(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        {producto.tiene_vencimiento && (
          <>
            <label className="block text-gray-400 text-sm mb-1">
              Vencimiento (mes y año)
            </label>
            <input
              type="month"
              value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
              required
              className={`${inputClass} mb-4`}
            />
          </>
        )}

        <label className="block text-gray-400 text-sm mb-1">
          Nº de lote (opcional)
        </label>
        <input
          type="text"
          value={nroLote}
          onChange={(e) => setNroLote(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        {total > 0 && (
          <p className="text-gray-300 text-sm mb-4">
            Se van a cargar: {formatearStock(total, producto.unidades_por_bulto)}
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
            {guardando ? 'Cargando...' : 'Cargar stock'}
          </button>
        </div>
      </form>
    </div>
  )
}
