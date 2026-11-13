'use client'

import { useState } from 'react'
import {
  csvPedido,
  descargarArchivo,
  htmlPedido,
  textoPedido,
} from '@/lib/enviarPedido'
import type { DatosEnvio } from '@/lib/enviarPedido'
import { formatearNumeroPedido } from '@/lib/pedidos'

type Props = {
  datos: DatosEnvio
  emailProveedor: string | null
  onCerrar: () => void
}

const botonClass =
  'text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-200 px-4 py-2 rounded-lg'

export default function EnviarPedidoModal({ datos, emailProveedor, onCerrar }: Props) {
  const [conPrecios, setConPrecios] = useState(true)
  const [mensaje, setMensaje] = useState('')

  const texto = textoPedido(datos, conPrecios)
  const nombreBase = formatearNumeroPedido(datos.numero)

  async function copiar() {
    setMensaje('')
    try {
      await navigator.clipboard.writeText(texto)
      setMensaje('Texto copiado. Ya lo podés pegar en WhatsApp o en un mail.')
    } catch {
      setMensaje('No se pudo copiar solo. Seleccioná el texto de arriba y copialo a mano.')
    }
  }

  function descargarExcel() {
    setMensaje('')
    descargarArchivo(
      `${nombreBase}.csv`,
      csvPedido(datos, conPrecios),
      'text/csv;charset=utf-8'
    )
    setMensaje('Listo: se bajó un archivo que se abre con Excel.')
  }

  function imprimir() {
    setMensaje('')
    const ventana = window.open('', '_blank')
    if (!ventana) {
      setMensaje('El navegador bloqueó la ventana. Permití las ventanas emergentes y probá de nuevo.')
      return
    }
    ventana.document.write(htmlPedido(datos, conPrecios))
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  const asunto = `Pedido ${nombreBase}`
  const enlaceCorreo = emailProveedor
    ? `mailto:${emailProveedor}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`
    : null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">Enviar al proveedor</h2>
        <p className="text-gray-500 text-sm mt-1 mb-4">
          {nombreBase} · {datos.proveedor}
        </p>

        <label className="flex items-center gap-2 text-gray-300 text-sm mb-3">
          <input
            type="checkbox"
            checked={conPrecios}
            onChange={(e) => setConPrecios(e.target.checked)}
          />
          Incluir precios y total
        </label>

        <textarea
          readOnly
          value={texto}
          rows={12}
          className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm font-mono outline-none mb-3"
        />

        <div className="flex flex-wrap gap-2">
          <button onClick={copiar} className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg">
            Copiar texto
          </button>
          <button onClick={descargarExcel} className={botonClass}>
            Descargar para Excel
          </button>
          <button onClick={imprimir} className={botonClass}>
            Imprimir / guardar PDF
          </button>
          {enlaceCorreo && (
            <a href={enlaceCorreo} className={botonClass}>
              Abrir en el correo
            </a>
          )}
        </div>

        {mensaje && <p className="text-gray-400 text-sm mt-3">{mensaje}</p>}

        <div className="flex justify-end mt-4">
          <button
            onClick={onCerrar}
            className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
