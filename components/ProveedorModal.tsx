'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setGuardando(true)

    const supabase = createClient()
    const datos = {
      p_nombre: nombre,
      p_telefono: telefono,
      p_email: email,
      p_notas: notas,
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
