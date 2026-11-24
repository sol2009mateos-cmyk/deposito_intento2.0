import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import {
  NOMBRE_TIPO,
  diaSiguiente,
  inicioDelDia,
  leerFiltros,
  palabrasBusqueda,
  type TipoMovimiento,
} from '@/lib/historial'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 50

type Movimiento = {
  id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  usuario_email: string | null
  creado_en: string
  productos: { nombre: string; unidades_por_bulto: number } | null
  lotes: { nro_lote: string | null; vencimiento: string | null } | null
}

type Filtros = {
  q?: string
  tipo?: string
  desde?: string
  hasta?: string
  pagina?: string
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Filtros
}) {
  const supabase = createClient()

  const { q, tipo, desde, hasta } = leerFiltros(searchParams)
  const paginaPedida = parseInt(searchParams.pagina ?? '1', 10)
  const pagina = Number.isNaN(paginaPedida) || paginaPedida < 1 ? 1 : paginaPedida

  const desdeFila = (pagina - 1) * POR_PAGINA

  const campoProducto =
    q === '' ? 'productos(nombre, unidades_por_bulto)' : 'productos!inner(nombre, unidades_por_bulto)'

  let consulta = supabase
    .from('movimientos_stock')
    .select(
      `id, tipo, cantidad, motivo, usuario_email, creado_en, ${campoProducto}, lotes(nro_lote, vencimiento)`,
      { count: 'exact' }
    )
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .range(desdeFila, desdeFila + POR_PAGINA - 1)

  const palabras = palabrasBusqueda(q)

  for (const palabra of palabras) {
    consulta = consulta.or(`nombre.ilike.%${palabra}%,codigo.ilike.%${palabra}%`, {
      referencedTable: 'productos',
    })
  }
  if (tipo !== '') consulta = consulta.eq('tipo', tipo)
  if (desde !== '') consulta = consulta.gte('creado_en', inicioDelDia(desde))
  if (hasta !== '') consulta = consulta.lt('creado_en', inicioDelDia(diaSiguiente(hasta)))

  const { data, error, count } = await consulta

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
  const total = count ?? 0
  const totalPaginas = Math.max(Math.ceil(total / POR_PAGINA), 1)
  const hayFiltros = q !== '' || tipo !== '' || desde !== '' || hasta !== ''

  // Link a otra página conservando los filtros.
  function linkPagina(nueva: number): string {
    const params = new URLSearchParams()
    if (q !== '') params.set('q', q)
    if (tipo !== '') params.set('tipo', tipo)
    if (desde !== '') params.set('desde', desde)
    if (hasta !== '') params.set('hasta', hasta)
    if (nueva > 1) params.set('pagina', String(nueva))
    const texto = params.toString()
    return texto === '' ? '/historial' : `/historial?${texto}`
  }

  // Misma búsqueda, para bajar todo (no solo esta página) a Excel.
  const paramsExportar = new URLSearchParams()
  if (q !== '') paramsExportar.set('q', q)
  if (tipo !== '') paramsExportar.set('tipo', tipo)
  if (desde !== '') paramsExportar.set('desde', desde)
  if (hasta !== '') paramsExportar.set('hasta', hasta)
  const textoExportar = paramsExportar.toString()
  const hrefExportar = textoExportar === '' ? '/historial/exportar' : `/historial/exportar?${textoExportar}`

  const inputClass =
    'bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">🕘 Historial de stock</h1>
      <p className="text-gray-500 text-sm mb-4">
        Todos los movimientos, del más nuevo al más viejo. Podés filtrar por producto, tipo y fecha.
      </p>

      <form method="get" action="/historial" className="bg-[#161922] rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-500 text-xs mb-1">Producto (nombre o código)</label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Ej: leche"
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Tipo</label>
            <select name="tipo" defaultValue={tipo} className={inputClass}>
              <option value="">Todos</option>
              {(Object.keys(NOMBRE_TIPO) as Movimiento['tipo'][]).map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className={inputClass} />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href="/historial"
                className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
              >
                Limpiar
              </Link>
            )}
            <a
              href={hrefExportar}
              title="Baja a Excel todos los movimientos que coinciden con los filtros"
              className="text-sm bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg"
            >
              ⬇ Excel
            </a>
          </div>
        </div>
      </form>

      <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
        {movimientos.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            {hayFiltros
              ? 'No hay movimientos con esos filtros.'
              : 'Todavía no hay movimientos de stock.'}
          </p>
        ) : (
          <>
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

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <p className="text-gray-500 text-xs">
                Mostrando {desdeFila + 1} a {desdeFila + movimientos.length} de {total}{' '}
                {total === 1 ? 'movimiento' : 'movimientos'}
              </p>
              <div className="flex items-center gap-2">
                {pagina > 1 ? (
                  <Link
                    href={linkPagina(pagina - 1)}
                    className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="text-xs text-gray-700 px-3 py-1.5">← Anterior</span>
                )}
                <span className="text-xs text-gray-500">
                  Página {pagina} de {totalPaginas}
                </span>
                {pagina < totalPaginas ? (
                  <Link
                    href={linkPagina(pagina + 1)}
                    className="text-xs bg-[#0f1117] hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg"
                  >
                    Siguiente →
                  </Link>
                ) : (
                  <span className="text-xs text-gray-700 px-3 py-1.5">Siguiente →</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
