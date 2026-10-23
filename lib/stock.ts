export type Categoria = {
  id: string
  nombre: string
}

export type Producto = {
  id: string
  nombre: string
  codigo: string | null
  categoria_id: string
  unidades_por_bulto: number
  tiene_vencimiento: boolean
  stock_minimo: number | null
  activo: boolean
}

export type Lote = {
  id: string
  producto_id: string
  vencimiento: string | null
  nro_lote: string | null
  cantidad_actual: number
}

// Muestra el stock como "12 bultos + 5 u (149 u en total)".
// Si el producto no viene en bultos, muestra solo unidades.
export function formatearStock(unidades: number, unidadesPorBulto: number): string {
  if (unidadesPorBulto <= 1) return `${unidades} u`

  const bultos = Math.floor(unidades / unidadesPorBulto)
  const sueltas = unidades % unidadesPorBulto

  if (bultos === 0) return `${sueltas} u`

  const textoBultos = `${bultos} ${bultos === 1 ? 'bulto' : 'bultos'}`

  if (sueltas === 0) return `${textoBultos} (${unidades} u en total)`

  return `${textoBultos} + ${sueltas} u (${unidades} u en total)`
}

// El vencimiento se guarda como fecha (último día del mes) y se muestra como mes/año.
export function formatearVencimiento(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes] = fecha.split('-')
  return `${mes}/${anio}`
}
