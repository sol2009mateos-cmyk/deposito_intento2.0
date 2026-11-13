import { formatearFecha, formatearNumeroPedido } from '@/lib/pedidos'
import { formatearPesos } from '@/lib/proveedores'

// Una línea del pedido, lista para armar el texto o el archivo que se le manda al proveedor.
export type LineaEnvio = {
  nombre: string
  codigo: string | null
  unidades_por_bulto: number
  // Siempre en unidades.
  cantidad: number
  // Precio por unidad.
  precio_unidad: number
}

export type DatosEnvio = {
  numero: number
  proveedor: string
  fechaPedido: string
  fechaEstimada: string | null
  notas: string | null
  lineas: LineaEnvio[]
}

// 30 u con bultos de 10 -> "3 bultos (30 u)". Sin bultos -> "30 u".
export function cantidadParaProveedor(unidades: number, porBulto: number): string {
  if (porBulto <= 1) return `${unidades} u`
  const bultos = Math.floor(unidades / porBulto)
  const sueltas = unidades % porBulto
  if (bultos === 0) return `${unidades} u`
  const textoBultos = `${bultos} ${bultos === 1 ? 'bulto' : 'bultos'}`
  if (sueltas === 0) return `${textoBultos} (${unidades} u)`
  return `${textoBultos} + ${sueltas} u (${unidades} u)`
}

// El formato de pesos de Intl usa un espacio especial que en WhatsApp o un mail se ve raro.
function pesos(valor: number): string {
  return formatearPesos(valor).replace(/\u00a0/g, ' ')
}

export function totalEnvio(lineas: LineaEnvio[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad * l.precio_unidad, 0)
}

// Texto simple, pensado para pegar en WhatsApp o en un mail.
export function textoPedido(datos: DatosEnvio, conPrecios: boolean): string {
  const filas: string[] = []
  filas.push(`Pedido ${formatearNumeroPedido(datos.numero)}`)
  filas.push(`Proveedor: ${datos.proveedor}`)
  filas.push(`Fecha del pedido: ${datos.fechaPedido}`)
  if (datos.fechaEstimada) {
    filas.push(`Llegada estimada: ${formatearFecha(datos.fechaEstimada)}`)
  }
  filas.push('')

  datos.lineas.forEach((l) => {
    const codigo = l.codigo ? ` (${l.codigo})` : ''
    const cantidad = cantidadParaProveedor(l.cantidad, l.unidades_por_bulto)
    const precio = conPrecios ? ` - ${pesos(l.precio_unidad)} c/u` : ''
    filas.push(`- ${l.nombre}${codigo}: ${cantidad}${precio}`)
  })

  if (conPrecios) {
    filas.push('')
    filas.push(`Total: ${pesos(totalEnvio(datos.lineas))}`)
  }

  if (datos.notas) {
    filas.push('')
    filas.push(`Notas: ${datos.notas}`)
  }

  return filas.join('\n')
}

function celdaCsv(texto: string): string {
  if (/[;"\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}

function numeroCsv(valor: number): string {
  return valor.toFixed(2).replace('.', ',')
}

// Archivo para abrir en Excel (separado por punto y coma, como lo espera Excel en Argentina).
export function csvPedido(datos: DatosEnvio, conPrecios: boolean): string {
  const filas: string[] = []
  filas.push(`Pedido;${formatearNumeroPedido(datos.numero)}`)
  filas.push(`Proveedor;${celdaCsv(datos.proveedor)}`)
  filas.push(`Fecha del pedido;${datos.fechaPedido}`)
  filas.push(`Llegada estimada;${datos.fechaEstimada ? formatearFecha(datos.fechaEstimada) : ''}`)
  filas.push('')

  const encabezado = ['Código', 'Producto', 'Unidades', 'Bultos']
  if (conPrecios) encabezado.push('Precio por unidad', 'Subtotal')
  filas.push(encabezado.join(';'))

  datos.lineas.forEach((l) => {
    const bultos = l.unidades_por_bulto > 1 ? numeroCsv(l.cantidad / l.unidades_por_bulto) : ''
    const fila = [
      celdaCsv(l.codigo ?? ''),
      celdaCsv(l.nombre),
      String(l.cantidad),
      bultos.replace(',00', ''),
    ]
    if (conPrecios) {
      fila.push(numeroCsv(l.precio_unidad), numeroCsv(l.cantidad * l.precio_unidad))
    }
    filas.push(fila.join(';'))
  })

  if (conPrecios) {
    filas.push('')
    filas.push(`;;;Total;;${numeroCsv(totalEnvio(datos.lineas))}`)
  }

  if (datos.notas) {
    filas.push('')
    filas.push(`Notas;${celdaCsv(datos.notas)}`)
  }

  // El carácter invisible del principio hace que Excel respete las tildes y la ñ.
  return '\uFEFF' + filas.join('\r\n')
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Página limpia para imprimir o guardar como PDF desde el navegador.
export function htmlPedido(datos: DatosEnvio, conPrecios: boolean): string {
  const titulo = `Pedido ${formatearNumeroPedido(datos.numero)}`

  const filas = datos.lineas
    .map((l) => {
      const celdas = [
        `<td>${escaparHtml(l.codigo ?? '')}</td>`,
        `<td>${escaparHtml(l.nombre)}</td>`,
        `<td>${escaparHtml(cantidadParaProveedor(l.cantidad, l.unidades_por_bulto))}</td>`,
      ]
      if (conPrecios) {
        celdas.push(
          `<td class="num">${escaparHtml(pesos(l.precio_unidad))}</td>`,
          `<td class="num">${escaparHtml(pesos(l.cantidad * l.precio_unidad))}</td>`
        )
      }
      return `<tr>${celdas.join('')}</tr>`
    })
    .join('')

  const encabezado = conPrecios
    ? '<th>Código</th><th>Producto</th><th>Cantidad</th><th class="num">Precio por unidad</th><th class="num">Subtotal</th>'
    : '<th>Código</th><th>Producto</th><th>Cantidad</th>'

  const total = conPrecios
    ? `<p class="total">Total: ${escaparHtml(pesos(totalEnvio(datos.lineas)))}</p>`
    : ''

  const notas = datos.notas
    ? `<p><strong>Notas:</strong> ${escaparHtml(datos.notas)}</p>`
    : ''

  const llegada = datos.fechaEstimada
    ? `<p>Llegada estimada: ${escaparHtml(formatearFecha(datos.fechaEstimada))}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escaparHtml(titulo)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; font-size: 14px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border-bottom: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f1f1f1; }
  .num { text-align: right; }
  .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 12px; }
</style>
</head>
<body>
<h1>${escaparHtml(titulo)}</h1>
<p>Proveedor: ${escaparHtml(datos.proveedor)}</p>
<p>Fecha del pedido: ${escaparHtml(datos.fechaPedido)}</p>
${llegada}
<table><thead><tr>${encabezado}</tr></thead><tbody>${filas}</tbody></table>
${total}
${notas}
</body>
</html>`
}

// Baja un archivo de texto al equipo.
export function descargarArchivo(nombre: string, contenido: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
