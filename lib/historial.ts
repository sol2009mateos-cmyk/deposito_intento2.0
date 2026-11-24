export type TipoMovimiento = 'carga_inicial' | 'recepcion' | 'salida' | 'ajuste'

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  carga_inicial: 'Carga inicial',
  recepcion: 'Recepción',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

// Filtros ya limpios y validados (los que vienen de la dirección de la página).
export type FiltrosHistorial = {
  q: string
  tipo: string
  desde: string
  hasta: string
}

const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/

export function leerFiltros(params: {
  q?: string | null
  tipo?: string | null
  desde?: string | null
  hasta?: string | null
}): FiltrosHistorial {
  // Se limpian los caracteres que rompen la búsqueda.
  const q = (params.q ?? '').replace(/[,()%*\\]/g, ' ').trim()
  const tipo = params.tipo && params.tipo in NOMBRE_TIPO ? params.tipo : ''
  const desde = params.desde && FECHA_OK.test(params.desde) ? params.desde : ''
  const hasta = params.hasta && FECHA_OK.test(params.hasta) ? params.hasta : ''
  return { q, tipo, desde, hasta }
}

// Se busca palabra por palabra (todas tienen que aparecer, en cualquier orden) y sin la
// "s" final del plural: "bolsas de consorcio" encuentra "Bolsa de consorcio 80x110".
export function palabrasBusqueda(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== '')
    .slice(0, 6)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
}

// Suma un día a una fecha "2026-11-17" (sin depender de la zona horaria del servidor).
export function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const siguiente = new Date(Date.UTC(a, m - 1, d + 1))
  return siguiente.toISOString().slice(0, 10)
}

// Argentina no usa horario de verano: siempre UTC-3.
export function inicioDelDia(fecha: string): string {
  return `${fecha}T00:00:00-03:00`
}
