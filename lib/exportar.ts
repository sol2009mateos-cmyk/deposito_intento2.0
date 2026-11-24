import { hoyArgentina } from '@/lib/pedidos'

export type Celda = string | number | null | undefined

// Texto de una celda para un archivo que se abre en Excel (separado por punto y coma).
export function celdaCsv(valor: Celda): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return String(valor).replace('.', ',')

  let texto = valor.replace(/\u00a0/g, ' ')
  // Un texto que empieza con = + - @ Excel lo tomaría como fórmula.
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`
  return texto
}

// Arma el contenido del archivo. El \uFEFF del principio hace que Excel muestre bien las tildes.
export function armarCsv(encabezado: string[], filas: Celda[][]): string {
  const lineas = [encabezado, ...filas].map((fila) => fila.map(celdaCsv).join(';'))
  return '\uFEFF' + lineas.join('\r\n') + '\r\n'
}

// "inventario" -> "inventario-2026-11-24.csv" (con la fecha de hoy en Argentina).
export function nombreArchivoCsv(base: string): string {
  return `${base}-${hoyArgentina()}.csv`
}

// Baja el archivo al equipo (solo se usa desde un botón, en el navegador).
export function descargarCsv(nombre: string, contenido: string): void {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
