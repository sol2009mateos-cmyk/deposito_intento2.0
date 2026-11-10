// Una fila del historial de precios del catálogo de un proveedor.
export type CambioPrecio = {
  id: string
  proveedor_id: string
  producto_id: string
  precio: number
  por_bulto: boolean
  precio_unidad: number
  precio_unidad_anterior: number | null
  cambiado_en: string
  cambiado_por_email: string | null
}

// Cuánto cambió un precio, en porcentaje. Devuelve null si no se puede calcular.
export function variacionPorcentaje(anterior: number | null, actual: number): number | null {
  if (anterior === null || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

// 5.26 -> "+5,3 %"   -2 -> "-2,0 %"
export function formatearVariacion(variacion: number | null): string {
  if (variacion === null) return ''
  const numero = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(variacion))
  if (Math.round(Math.abs(variacion) * 10) === 0) return `${numero} %`
  return `${variacion > 0 ? '+' : '-'}${numero} %`
}

// Dos precios se consideran distintos si difieren más de medio centavo.
export function preciosDistintos(a: number, b: number): boolean {
  return Math.abs(a - b) > 0.005
}
