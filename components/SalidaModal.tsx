'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aUnidades } from '@/lib/recepcion'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import type { Lote, Producto } from '@/lib/stock'

type Props = {
  producto: Producto
  // Lotes del producto con stock.
  lotes: Lote[]
  onCerrar: () => void
}

type LoteRetirado = {
  nro_lote: string | null
  vencimiento: string | null
  cantidad: number
}

const MOTIVOS = [
  { valor: 'local', label: 'Local' },
  { valor: 'cliente', label: 'Cliente' },
  { valor: 'merma', label: 'Merma' },
  { valor: 'rotura', label: 'Rotura' },
]

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

// Primero el lote que vence antes; los que no vencen, al final.
function porVencimiento(a: Lote, b: Lote) {
  if (a.vencimiento === b.vencimiento) return 0
  if (a.vencimiento === null) return 1
  if (b.vencimiento === null) return -1
  return a.vencimiento.localeCompare(b.vencimiento)
}

function textoLote(l: { nro_lote: string | null; vencimiento: string | null }) {
  return `Lote ${l.nro_lote ?? 'sin número'} · ${
    l.vencimiento ? `vence ${formatearVencimiento(l.vencimiento)}` : 'sin vencimiento'
  }`
}

export default function SalidaModal({ producto, lotes, onCerrar }: Props) {
  const router = useRouter()
  const porBulto = producto.unidades_por_bulto
  const usaBultos = porBulto > 1

  const ordenados = [...lotes]
    .filter((l) => l.cantidad_actual > 0)
    .sort(porVencimiento)
  const disponible = ordenados.reduce((suma, l) => suma + l.cantidad_actual, 0)

  const [bultos, setBultos] = useState('')
  const [sueltas, setSueltas] = useState('')
  const [motivo, setMotivo] = useState('')
  const [destino, setDestino] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [retirados, setRetirados] = useState<LoteRetirado[] | null>(null)

  const total = aUnidades(usaBultos ? bultos : '', sueltas, porBulto)

  // Vista previa de los lotes de los que se va a sacar.
  const previa: { lote: Lote; cantidad: number }[] = []
  let restante = total
  for (const l of ordenados) {
    if (restante <= 0) break
    const tomar = Math.min(l.cantidad_actual, restante)
    previa.push({ lote: l, cantidad: tomar })
    restante -= tomar
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (total <= 0) {
      setErrorMsg('Cargá una cantidad mayor a cero')
      return
    }
    if (total > disponible) {
      setErrorMsg(
        `No hay stock suficiente: hay ${formatearStock(disponible, porBulto)}`
      )
      return
    }
    if (motivo === '') {
      setErrorMsg('Elegí el motivo de la salida')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const { data, error } = await supabase.rpc('registrar_salida', {
      p_producto_id: producto.id,
      p_cantidad: total,
      p_motivo_tipo: motivo,
      p_destino: destino,
      p_notas: notas,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setRetirados((data as { lotes: LoteRetirado[] }).lotes ?? [])
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">Registrar salida</h2>
        <p className="text-gray-400 text-sm mt-1">{producto.nombre}</p>
        <p className="text-gray-600 text-xs mb-4">
          Stock actual: {formatearStock(disponible, porBulto)}
        </p>

        {retirados ? (
          <div>
            <p className="text-green-400 text-sm mb-3">La salida quedó registrada.</p>
            <p className="text-gray-300 text-sm mb-2">Retirá de estos lotes:</p>
            <div className="flex flex-col gap-1 mb-4">
              {retirados.map((l, i) => (
                <p key={i} className="text-gray-400 text-sm">
                  {textoLote(l)} · {formatearStock(l.cantidad, porBulto)}
                </p>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={onCerrar}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : disponible === 0 ? (
          <div>
            <p className="text-gray-500 text-sm mb-4">
              Este producto no tiene stock para sacar.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onCerrar}
                className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={guardar}>
            {usaBultos && (
              <>
                <label className="block text-gray-400 text-sm mb-1">
                  Bultos (1 bulto = {porBulto} u)
                </label>
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
              value={sueltas}
              onChange={(e) => setSueltas(e.target.value)}
              className={`${inputClass} mb-4`}
            />

            <label className="block text-gray-400 text-sm mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className={`${inputClass} mb-4`}
            >
              <option value="">Elegí el motivo</option>
              {MOTIVOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>

            <label className="block text-gray-400 text-sm mb-1">
              A dónde va o detalle (opcional)
            </label>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej: nombre del cliente o del local"
              className={`${inputClass} mb-4`}
            />

            <label className="block text-gray-400 text-sm mb-1">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={`${inputClass} mb-4`}
            />

            {total > 0 && total <= disponible && (
              <div className="mb-4">
                <p className="text-gray-300 text-sm">
                  Se van a sacar: {formatearStock(total, porBulto)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Sale primero lo que vence antes:
                </p>
                {previa.map((p) => (
                  <p key={p.lote.id} className="text-gray-500 text-xs">
                    {textoLote(p.lote)} · {formatearStock(p.cantidad, porBulto)}
                  </p>
                ))}
              </div>
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
                {guardando ? 'Guardando...' : 'Registrar salida'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
