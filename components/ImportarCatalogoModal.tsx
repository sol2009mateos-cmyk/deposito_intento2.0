'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parsearPegado } from '@/lib/proveedores'
import type { Proveedor, ResultadoImportacion } from '@/lib/proveedores'

type Props = {
  proveedor: Proveedor
  onCerrar: () => void
}

function ListaResultado({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-yellow-400 text-sm">
        {titulo} ({items.length}):
      </p>
      <ul className="text-gray-400 text-xs list-disc ml-5 mt-1">
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ImportarCatalogoModal({ proveedor, onCerrar }: Props) {
  const router = useRouter()

  const [texto, setTexto] = useState('')
  const [importando, setImportando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)

  const filas = useMemo(() => parsearPegado(texto), [texto])
  const sinPrecio = filas.filter((f) => f.precio === null).length

  async function importar() {
    setErrorMsg('')

    if (filas.length === 0) {
      setErrorMsg('Pegá primero las filas del Excel')
      return
    }

    setImportando(true)

    const supabase = createClient()
    const { data, error } = await supabase.rpc('importar_catalogo', {
      p_proveedor_id: proveedor.id,
      p_filas: filas,
    })

    setImportando(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setResultado(data as ResultadoImportacion)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">Importar desde Excel</h2>
        <p className="text-gray-500 text-sm mt-1 mb-4">{proveedor.nombre}</p>

        {resultado ? (
          <div>
            <p className="text-green-400 text-sm">
              Se importaron {resultado.importados}{' '}
              {resultado.importados === 1 ? 'producto' : 'productos'}.
            </p>

            <ListaResultado
              titulo="No se encontraron en el inventario"
              items={resultado.no_encontrados}
            />
            <ListaResultado
              titulo="Tienen el nombre repetido, usá el código"
              items={resultado.nombre_repetido}
            />
            <ListaResultado
              titulo="Ya están en el catálogo de otro proveedor"
              items={resultado.de_otro_proveedor}
            />
            <ListaResultado
              titulo="Filas con datos que no se pudieron leer"
              items={resultado.invalidos}
            />

            <div className="flex justify-end mt-6">
              <button
                onClick={onCerrar}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm mb-1">
              Copiá las filas desde Excel y pegalas acá. Cada fila lleva estas columnas:
            </p>
            <ol className="text-gray-500 text-xs list-decimal ml-5 mb-3">
              <li>Producto (el nombre exacto o el código)</li>
              <li>Precio en pesos</li>
              <li>Opcional: &quot;bulto&quot; o &quot;unidad&quot; (si lo dejás vacío, es por unidad)</li>
            </ol>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              placeholder="Pegá acá las filas copiadas del Excel"
              className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-blue-500"
            />

            {filas.length > 0 && (
              <p className="text-gray-400 text-xs mt-2">
                Se leyeron {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
                {sinPrecio > 0 &&
                  `, y ${sinPrecio} no tienen un precio que se pueda leer (esas no se van a importar)`}
                .
              </p>
            )}

            {errorMsg && <p className="text-red-400 text-sm mt-3">{errorMsg}</p>}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onCerrar}
                className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={importar}
                disabled={importando || filas.length === 0}
                className="text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
              >
                {importando ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
