import type { Lote, Producto } from '@/lib/stock'

// Cuántos días antes del vencimiento se avisa.
export const DIAS_ALERTA_VENCIMIENTO = 30

// "Qué pedir" sugiere reponer hasta este múltiplo del stock mínimo.
export const FACTOR_REPOSICION = 2

export type ProductoBajo = {
  producto: Producto
  stock: number // unidades que hay hoy
  minimo: number // stock mínimo, en unidades
  enCamino: number // unidades en pedidos pendientes de recibir
  enBorrador: number // unidades en pedidos en borrador (solo informativo)
  sugerido: number // unidades sugeridas, en bultos completos
  proveedorId: string | null // proveedor de cuyo catálogo es el producto
}

export type LoteProximo = {
  lote: Lote
  producto: Producto
  dias: number // días hasta el vencimiento; negativo = ya vencido
}

// Stock total en unidades de cada producto.
export function stockPorProducto(lotes: Lote[]): Map<string, number> {
  const mapa = new Map<string, number>()
  lotes.forEach((l) => {
    if (l.cantidad_actual > 0) {
      mapa.set(l.producto_id, (mapa.get(l.producto_id) ?? 0) + l.cantidad_actual)
    }
  })
  return mapa
}

// Productos activos con stock mínimo cargado y stock igual o menor a ese mínimo.
// Si se pasa "soloLoQueFalta", se cuenta también lo que ya viene en camino:
// así "Qué pedir" no sugiere pedir lo que ya está pedido.
export function calcularBajoStock(
  productos: Producto[],
  stock: Map<string, number>,
  enCaminoPorProducto: Map<string, number>,
  enBorradorPorProducto: Map<string, number>,
  proveedorPorProducto: Map<string, string>,
  soloLoQueFalta: boolean
): ProductoBajo[] {
  const lista: ProductoBajo[] = []

  productos.forEach((p) => {
    if (!p.activo || p.stock_minimo === null) return

    const actual = stock.get(p.id) ?? 0
    const enCamino = enCaminoPorProducto.get(p.id) ?? 0
    const enBorrador = enBorradorPorProducto.get(p.id) ?? 0
    const proyectado = soloLoQueFalta ? actual + enCamino : actual

    if (proyectado > p.stock_minimo) return

    const objetivo = p.stock_minimo * FACTOR_REPOSICION
    const faltante = Math.max(objetivo - actual - enCamino, 1)
    const porBulto = p.unidades_por_bulto
    const sugerido = Math.ceil(faltante / porBulto) * porBulto

    lista.push({
      producto: p,
      stock: actual,
      minimo: p.stock_minimo,
      enCamino,
      enBorrador,
      sugerido,
      proveedorId: proveedorPorProducto.get(p.id) ?? null,
    })
  })

  return lista.sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
}

// Días entre dos fechas "YYYY-MM-DD" (hasta - desde).
export function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number)
  const [a2, m2, d2] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Lotes con stock que ya vencieron o vencen dentro de los días de alerta.
export function lotesPorVencer(
  productos: Producto[],
  lotes: Lote[],
  hoy: string
): LoteProximo[] {
  const productoPorId = new Map<string, Producto>()
  productos.forEach((p) => productoPorId.set(p.id, p))

  const lista: LoteProximo[] = []

  lotes.forEach((l) => {
    if (l.cantidad_actual <= 0 || l.vencimiento === null) return
    const producto = productoPorId.get(l.producto_id)
    if (!producto) return

    const dias = diasEntre(hoy, l.vencimiento)
    if (dias <= DIAS_ALERTA_VENCIMIENTO) lista.push({ lote: l, producto, dias })
  })

  return lista.sort((a, b) => a.dias - b.dias)
}
