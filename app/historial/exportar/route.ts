import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { armarCsv, nombreArchivoCsv } from '@/lib/exportar'
import {
  NOMBRE_TIPO,
  diaSiguiente,
  inicioDelDia,
  leerFiltros,
  palabrasBusqueda,
  type TipoMovimiento,
} from '@/lib/historial'

export const dynamic = 'force-dynamic'

// Supabase entrega como máximo 1000 filas por pedido, así que se pide por tandas.
const TANDA = 1000
const MAXIMO = 20000

type Fila = {
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  usuario_email: string | null
  creado_en: string
  productos: { nombre: string; codigo: string | null; unidades_por_bulto: number } | null
  lotes: { nro_lote: string | null; vencimiento: string | null } | null
}

function fechaHora(fecha: string): string {
  return new Date(fecha)
    .toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(', ', ' ')
}

function mesAnio(fecha: string | null): string {
  if (!fecha) return ''
  const [anio, mes] = fecha.split('-')
  return `${mes}/${anio}`
}

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams
  const { q, tipo, desde, hasta } = leerFiltros({
    q: parametros.get('q'),
    tipo: parametros.get('tipo'),
    desde: parametros.get('desde'),
    hasta: parametros.get('hasta'),
  })

  const supabase = createClient()
  const campoProducto =
    q === ''
      ? 'productos(nombre, codigo, unidades_por_bulto)'
      : 'productos!inner(nombre, codigo, unidades_por_bulto)'
  const palabras = palabrasBusqueda(q)

  const filas: Fila[] = []
  let hayMas = false

  for (let desdeFila = 0; desdeFila < MAXIMO; desdeFila += TANDA) {
    let consulta = supabase
      .from('movimientos_stock')
      .select(
        `tipo, cantidad, motivo, usuario_email, creado_en, ${campoProducto}, lotes(nro_lote, vencimiento)`
      )
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .range(desdeFila, desdeFila + TANDA - 1)

    for (const palabra of palabras) {
      consulta = consulta.or(`nombre.ilike.%${palabra}%,codigo.ilike.%${palabra}%`, {
        referencedTable: 'productos',
      })
    }
    if (tipo !== '') consulta = consulta.eq('tipo', tipo)
    if (desde !== '') consulta = consulta.gte('creado_en', inicioDelDia(desde))
    if (hasta !== '') consulta = consulta.lt('creado_en', inicioDelDia(diaSiguiente(hasta)))

    const { data, error } = await consulta

    if (error) {
      return NextResponse.json(
        { error: `No se pudo exportar el historial: ${error.message}` },
        { status: 500 }
      )
    }

    const tanda = (data ?? []) as unknown as Fila[]
    filas.push(...tanda)

    if (tanda.length < TANDA) break
    if (desdeFila + TANDA >= MAXIMO) hayMas = true
  }

  const encabezado = [
    'Fecha y hora',
    'Código',
    'Producto',
    'Nº de lote',
    'Vencimiento',
    'Tipo',
    'Movimiento',
    'Unidades (con signo)',
    'Bultos completos',
    'Unidades sueltas',
    'Motivo',
    'Usuario',
  ]

  const datos = filas.map((m) => {
    const porBulto = m.productos?.unidades_por_bulto ?? 1
    const absoluto = Math.abs(m.cantidad)
    return [
      fechaHora(m.creado_en),
      m.productos?.codigo ?? '',
      m.productos?.nombre ?? '',
      m.lotes?.nro_lote ?? '',
      mesAnio(m.lotes?.vencimiento ?? null),
      NOMBRE_TIPO[m.tipo] ?? m.tipo,
      m.cantidad > 0 ? 'Entrada' : 'Salida',
      m.cantidad,
      porBulto > 1 ? Math.floor(absoluto / porBulto) : '',
      porBulto > 1 ? absoluto % porBulto : absoluto,
      m.motivo ?? '',
      m.usuario_email ?? '',
    ]
  })

  if (hayMas) {
    datos.push([
      `Se exportaron los ${MAXIMO} movimientos más nuevos. Usá los filtros para ver el resto.`,
    ])
  }

  return new Response(armarCsv(encabezado, datos), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivoCsv('historial')}"`,
      'Cache-Control': 'no-store',
    },
  })
}
