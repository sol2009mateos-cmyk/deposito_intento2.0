export type EstadoPedido = 'borrador' | 'pendiente' | 'cancelado'

export type Pedido = {
  id: string
  numero: number
  proveedor_id: string
  estado: EstadoPedido
  fecha_pedido: string
  fecha_estimada: string | null
  notas: string | null
  creado_por_email: string | null
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
  cancelado: 'Cancelado',
}

export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'bg-gray-800 text-gray-300',
  pendiente: 'bg-yellow-900 text-yellow-300',
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
