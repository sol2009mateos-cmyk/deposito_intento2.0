export type EstadoPedido = 'borrador' | 'pendiente' | 'recibido' | 'cancelado'

export type Pedido = {
  id: string
  numero: number
  proveedor_id: string
  estado: EstadoPedido
  fecha_pedido: string
  fecha_estimada: string | null
  notas: string | null
  creado_por_email: string | null
  confirmado_en: string | null
  confirmado_por_email: string | null
  cancelado_en: string | null
  cancelado_por_email: string | null
  motivo_cancelacion: string | null
}

// La cantidad está siempre en unidades y el precio es por unidad.
export type ItemPedido = {
  id: string
  pedido_id: string
  producto_id: string
  cantidad: number
  precio_unidad: number
}

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente de recibir',
  recibido: 'Recibido',
  cancelado: 'Cancelado',
}

export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'bg-gray-800 text-gray-300',
  pendiente: 'bg-yellow-900 text-yellow-300',
  recibido: 'bg-green-900 text-green-300',
  cancelado: 'bg-red-900 text-red-300',
}

// 7 -> "PED-0007"
export function formatearNumeroPedido(numero: number): string {
  return `PED-${String(numero).padStart(4, '0')}`
}

// Total del pedido en pesos: suma de cantidad × precio por unidad de cada línea.
export function totalPedido(items: ItemPedido[]): number {
  return items.reduce((suma, i) => suma + i.cantidad * i.precio_unidad, 0)
}

// "2026-11-15" -> "15/11/2026". Es solo la fecha, sin horas.
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

// Fecha de hoy en Argentina, como "2026-11-06".
export function hoyArgentina(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

// ¿La fecha ya pasó? (solo cuenta como pasada a partir del día siguiente)
export function fechaPasada(fecha: string | null): boolean {
  return fecha !== null && fecha < hoyArgentina()
}

// Un pedido está atrasado si sigue pendiente de recibir y ya pasó su fecha estimada.
export function estaAtrasado(estado: EstadoPedido, fechaEstimada: string | null): boolean {
  return estado === 'pendiente' && fechaPasada(fechaEstimada)
}

// Fecha y hora de un momento, en horario de Argentina: 03/11/2026 18:43
export function formatearFechaHoraPedido(fecha: string): string {
  return new Date(fecha).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
