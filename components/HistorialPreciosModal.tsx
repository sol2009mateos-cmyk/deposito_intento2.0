'use client'

import { formatearFechaHoraPedido } from '@/lib/pedidos'
import { formatearPesos } from '@/lib/proveedores'
import { formatearVariacion, variacionPorcentaje } from '@/lib/precios'
import type { CambioPrecio } from '@/lib/precios'
import type { Producto } from '@/lib/stock'

type Props = {
  producto: Producto
  // Cambios de este producto, del más nuevo al más viejo.
  cambios: CambioPrecio[]
  onCerrar: () => void
}

export default function HistorialPreciosModal({ producto, cambios, onCerrar }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161922] border border-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white">Historial de precios</h2>
        <p className="text-gray-400 text-sm mt-1 mb-4">{producto.nombre}</p>

        {cambios.length === 0 ? (
          <p className="text-gray-500 text-sm">Todavía no hay precios anotados para este producto.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Precio cargado</th>
                <th className="pb-2">Por unidad</th>
                <th className="pb-2">Cambio</th>
                <th className="pb-2">Quién</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => {
                const variacion = variacionPorcentaje(c.precio_unidad_anterior, c.precio_unidad)
                return (
                  <tr key={c.id} className="border-b border-gray-800">
                    <td className="py-2 text-gray-400 whitespace-nowrap">
                      {formatearFechaHoraPedido(c.cambiado_en)}
                    </td>
                    <td className="py-2 text-gray-300">
                      {formatearPesos(c.precio)}{' '}
                      <span className="text-gray-500 text-xs">
                        {c.por_bulto ? 'por bulto' : 'por unidad'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-200">{formatearPesos(c.precio_unidad)}</td>
                    <td
                      className={`py-2 ${
                        variacion === null
                          ? 'text-gray-600'
                          : variacion > 0
                          ? 'text-red-400'
                          : variacion < 0
                          ? 'text-green-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {c.precio_unidad_anterior === null
                        ? 'Primer precio'
                        : formatearVariacion(variacion)}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{c.cambiado_por_email ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

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
