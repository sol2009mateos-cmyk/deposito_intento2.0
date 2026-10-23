'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Categoria, Producto } from '@/lib/stock'

type Props = {
  categorias: Categoria[]
  producto: Producto | null
  onCerrar: () => void
}

const inputClass =
  'w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

export default function ProductoModal({ categorias, producto, onCerrar }: Props) {
  const router = useRouter()
  const editando = producto !== null

  const [lista, setLista] = useState<Categoria[]>(categorias)
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [codigo, setCodigo] = useState(producto?.codigo ?? '')
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? '')
  const [unidadesPorBulto, setUnidadesPorBulto] = useState(
    String(producto?.unidades_por_bulto ?? 1)
  )
  const [tieneVencimiento, setTieneVencimiento] = useState(
    producto?.tiene_vencimiento ?? false
  )
  const [stockMinimo, setStockMinimo] = useState(
    producto?.stock_minimo != null ? String(producto.stock_minimo) : ''
  )
  const [activo, setActivo] = useState(producto?.activo ?? true)

  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function crearCategoria() {
    const nombreCat = nuevaCategoria.trim()
    if (!nombreCat) {
      setErrorMsg('Escribí el nombre de la categoría')
      return
    }

    setGuardando(true)
    setErrorMsg('')

    const supabase = createClient()
    const { data, error } = await supabase.rpc('crear_categoria', {
      p_nombre: nombreCat,
    })

    setGuardando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    const nueva: Categoria = { id: data as string, nombre: nombreCat }
    setLista((prev) =>
      [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
    setCategoriaId(nueva.id)
    setNuevaCategoria('')
    setCreandoCategoria(false)
    router.refresh()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const porBulto = parseInt(unidadesPorBulto, 10)
    if (Number.isNaN(porBulto) || porBulto < 1) {
      setErrorMsg('Las unidades por bulto tienen que ser 1 o más')
      return
    }

    const minimo = stockMinimo.trim() === '' ? null : parseInt(stockMinimo, 10)
    if (minimo !== null && (Number.isNaN(minimo) || minimo < 0)) {
      setErrorMsg('El stock mínimo tiene que ser un número de 0 o más')
      return
    }

    setGuardando(true)

    const supabase = createClient()
    const datos = {
      p_nombre: nombre,
      p_codigo: codigo.trim() === '' ? null : codigo.trim(),
      p_categoria_id: categoriaId === '' ? null : categoriaId,
      p_unidades_por_bulto: porBulto,
      p_tiene_vencimiento: tieneVencimiento,
      p_stock_minimo: minimo,
    }

    const { error } = producto
      ? await supabase.rpc('editar_producto', {
          p_id: producto.id,
          ...datos,
          p_activo: activo,
        })
      : await supabase.rpc('crear_producto', datos)

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
          {editando ? 'Editar producto' : 'Nuevo producto'}
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
          Código (opcional)
        </label>
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <label className="block text-gray-400 text-sm mb-1">Categoría</label>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          required
          className={`${inputClass} mb-2`}
        >
          <option value="">Elegí una categoría</option>
          {lista.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        {creandoCategoria ? (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  crearCategoria()
                }
              }}
              placeholder="Nombre de la categoría nueva"
              className={inputClass}
            />
            <button
              type="button"
              onClick={crearCategoria}
              disabled={guardando}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 rounded-lg"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => {
                setCreandoCategoria(false)
                setNuevaCategoria('')
              }}
              className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreandoCategoria(true)}
            className="text-xs text-blue-400 hover:text-blue-300 mb-4"
          >
            ＋ Nueva categoría
          </button>
        )}

        <label className="block text-gray-400 text-sm mb-1">
          Unidades por bulto
        </label>
        <input
          type="number"
          min={1}
          value={unidadesPorBulto}
          onChange={(e) => setUnidadesPorBulto(e.target.value)}
          required
          className={`${inputClass} mb-1`}
        />
        <p className="text-gray-600 text-xs mb-4">
          Si el producto no viene en bultos, dejá 1.
        </p>

        <label className="block text-gray-400 text-sm mb-1">
          Stock mínimo en unidades (opcional)
        </label>
        <input
          type="number"
          min={0}
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <label className="flex items-center gap-2 text-gray-300 text-sm mb-3">
          <input
            type="checkbox"
            checked={tieneVencimiento}
            onChange={(e) => setTieneVencimiento(e.target.checked)}
          />
          Tiene vencimiento
        </label>

        {editando && (
          <label className="flex items-center gap-2 text-gray-300 text-sm mb-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Producto activo
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
