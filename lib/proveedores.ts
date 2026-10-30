export type Proveedor = {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
  activo: boolean
}

export type ItemCatalogo = {
  id: string
  proveedor_id: string
  producto_id: string
  precio: number
  por_bulto: boolean
  precio_unidad: number
}

export type FilaImportar = {
  producto: string
  precio: number | null
  tipo: string | null
}

export type ResultadoImportacion = {
  importados: number
  no_encontrados: string[]
  nombre_repetido: string[]
  de_otro_proveedor: string[]
  invalidos: string[]
}

// Muestra un número como pesos argentinos: $ 1.234,50
export function formatearPesos(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

// Convierte un texto de precio a número. Entiende "1234.5", "1.234,50", "$ 1.234", etc.
// Devuelve null si no se puede leer.
export function parsearPrecio(texto: string): number | null {
  let limpio = texto.replace(/ars|\$|\s/gi, '')
  if (limpio === '') return null

  const tieneComa = limpio.includes(',')
  const tienePunto = limpio.includes('.')

  if (tieneComa && tienePunto) {
    // El último símbolo que aparece es el decimal.
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (tieneComa) {
    limpio = limpio.replace(',', '.')
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "1.234" o "12.345.678": los puntos son separadores de miles.
    limpio = limpio.replace(/\./g, '')
  }

  if (!/^\d+(\.\d+)?$/.test(limpio)) return null

  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

function normalizarTipo(texto: string): string | null {
  const t = texto.trim().toLowerCase()
  if (t === '') return null
  if (t.startsWith('bulto') || t === 'b') return 'bulto'
  if (t.startsWith('unid') || t === 'u') return 'unidad'
  return t
}

// Lee lo que se pega desde Excel: una fila por línea, columnas separadas por tab
// (o por punto y coma). Columnas: producto, precio y, opcional, "bulto" o "unidad".
// Si la primera fila no tiene un precio legible, se toma como encabezado y se salta.
export function parsearPegado(texto: string): FilaImportar[] {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')

  const filas: FilaImportar[] = []

  lineas.forEach((linea, indice) => {
    const separador = linea.includes('\t') ? '\t' : ';'
    const columnas = linea.split(separador).map((c) => c.trim())

    const producto = columnas[0] ?? ''
    const precio = parsearPrecio(columnas[1] ?? '')
    const tipo = normalizarTipo(columnas[2] ?? '')

    if (indice === 0 && precio === null) return

    filas.push({ producto, precio, tipo })
  })

  return filas
}
