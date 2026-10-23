import { createClient } from '@/lib/supabase/server'
import { formatearStock, formatearVencimiento } from '@/lib/stock'

export const dynamic = 'force-dynamic'

type Movimiento = {
  id: string
  tipo: 'carga_inicial' | 'recepcion' | 'salida' | 'ajuste'
  cantidad: number
  motivo: string | null
  usuario_email: string | null
  creado_en: string
  productos: { nombre: string; unidades_por_bulto: number } | null
  lotes: { nro_lote: string | null; vencimiento: string | null } | null
}

const NOMBRE_TIPO: Record<Movimiento['tipo'], string> = {
  carga_inicial: 'Carga inicial',
  recepcion: 'Recepción',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

export default async function HistorialPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('movimientos_stock')
    .select(
      'id, tipo, cantidad, motivo, usuario_email, creado_en, productos(nombre, unidades_por_bulto), lotes(nro_lote, vencimiento)'
    )
    .order('creado_en', { ascending: false })
    .limit(200)

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🕘 Historial de stock</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar el historial: {error.message}
        </p>
      </div>
    )
  }

  const movimientos = (data ?? []) as unknown as Movimiento[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">🕘 Historial de stock</h1>
      <p className="text-gray-500 text-sm mb-6">
        Los últimos 200 movimientos, del más nuevo al más viejo.
      </p>

      <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
        {movimientos.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            Todavía no hay movimientos de stock.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Producto</th>
                <th className="pb-2">Lote</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Cantidad</th>
                <th className="pb-2">Motivo</th>
                <th className="pb-2">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const entra = m.cantidad > 0
                const porBulto = m.productos?.unidades_por_bulto ?? 1
                return (
                  <tr key={m.id} className="border-b border-gray-800">
                    <td className="py-3 text-gray-500 whitespace-nowrap">
                      {new Date(m.creado_en).toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                      })}
                    </td>
                    <td className="py-3 text-gray-200">
                      {m.productos?.nombre ?? '—'}
                    </td>
                    <td className="py-3 text-gray-400">
                      {m.lotes
                        ? `${m.lotes.nro_lote ?? 'sin número'}${
                            m.lotes.vencimiento
                              ? ` · vence ${formatearVencimiento(m.lotes.vencimiento)}`
                              : ''
                          }`
                        : '—'}
                    </td>
                    <td className="py-3 text-gray-300">{NOMBRE_TIPO[m.tipo]}</td>
                    <td
                      className={`py-3 whitespace-nowrap ${
                        entra ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {entra ? '+' : '−'}
                      {formatearStock(Math.abs(m.cantidad), porBulto)}
                    </td>
                    <td className="py-3 text-gray-400">{m.motivo ?? '—'}</td>
                    <td className="py-3 text-gray-500">{m.usuario_email ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
