// Pedido pendiente de recibir (sin precios).
export type PedidoPorRecibir = {
  id: string
  numero: number
  proveedor_nombre: string
  fecha_pedido: string
  fecha_estimada: string | null
}

// Producto y cantidad pedida (en unidades) de un pedido pendiente.
export type ItemPorRecibir = {
  pedido_id: string
  producto_id: string
  cantidad: number
}

export type Recepcion = {
  id: string
  pedido_id: string
  pedido_numero: number
  proveedor_nombre: string
  nro_remito: string | null
  notas: string | null
  recibido_por_email: string | null
  recibido_en: string
  anulada_en: string | null
  anulada_por_email: string | null
  motivo_anulacion: string | null
}

// Todas las cantidades están en unidades.
export type RecepcionItem = {
  id: string
  recepcion_id: string
  producto_id: string
  pedido_cantidad: number
  recibido: number
  roto: number
  faltante: number
}

export type RecepcionLote = {
  id: string
  recepcion_id: string
  producto_id: string
  lote_id: string
  cantidad: number
}

// Lo que se manda a la función recibir_pedido (todo en unidades).
export type LoteRecibido = {
  cantidad: number
  vencimiento: string | null
  nro_lote: string | null
}

export type ItemRecibido = {
  producto_id: string
  roto: number
  lotes: LoteRecibido[]
}

// Fecha y hora de un momento, en horario de Argentina: 03/11/2026 18:43
export function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Convierte bultos + unidades sueltas a unidades. Si el texto está vacío, cuenta 0.
export function aUnidades(
  bultos: string,
  sueltas: string,
  unidadesPorBulto: number
): number {
  const b = parseInt(bultos, 10)
  const s = parseInt(sueltas, 10)
  const nb = Number.isNaN(b) || b < 0 ? 0 : b
  const ns = Number.isNaN(s) || s < 0 ? 0 : s
  return nb * unidadesPorBulto + ns
}
