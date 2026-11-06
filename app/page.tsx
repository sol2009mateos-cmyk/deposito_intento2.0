import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { obtenerRol } from '@/lib/roles'
import {
  DIAS_ALERTA_VENCIMIENTO,
  calcularBajoStock,
  lotesPorVencer,
  stockPorProducto,
} from '@/lib/reposicion'
import {
  fechaPasada,
  formatearFecha,
  formatearNumeroPedido,
  hoyArgentina,
} from '@/lib/pedidos'
import type { PedidoPorRecibir } from '@/lib/recepcion'
import { formatearStock, formatearVencimiento } from '@/lib/stock'
import type { Lote, Producto } from '@/lib/stock'

export const dynamic = 'force-dynamic'

const NOMBRE_ROL = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operario: 'Operario',
} as const

const MAXIMO_EN_LISTA = 8

function textoDias(dias: number): string {
  if (dias < 0) return `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`
  if (dias === 0) return 'Vence hoy'
  return `En ${dias} ${dias === 1 ? 'día' : 'días'}`
}

export default async function Dashboard() {
  const rol = await obtenerRol()
  const supabase = createClient()

  const [productos, lotes, pendientes] = await Promise.all([
    supabase
      .from('productos')
      .select(
        'id, nombre, codigo, categoria_id, unidades_por_bulto, tiene_vencimiento, stock_minimo, activo'
      ),
    supabase
      .from('lotes')
      .select('id, producto_id, vencimiento, nro_lote, cantidad_actual'),
    supabase.rpc('pedidos_por_recibir'),
  ])

  const error = productos.error ?? lotes.error ?? pendientes.error

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">🏭 Depósito</h1>
        <p className="text-red-400 text-sm mt-2">
          No se pudo cargar el resumen: {error.message}
        </p>
      </div>
    )
  }

  const listaProductos = (productos.data ?? []) as Producto[]
  const listaLotes = (lotes.data ?? []) as Lote[]
  const listaPendientes = (pendientes.data ?? []) as PedidoPorRecibir[]

  const hoy = hoyArgentina()
  const porVencer = lotesPorVencer(listaProductos, listaLotes, hoy)
  const vencidos = porVencer.filter((l) => l.dias < 0).length

  const bajos = calcularBajoStock(
    listaProductos,
    stockPorProducto(listaLotes),
    new Map(),
    new Map(),
    new Map(),
    false
  )

  const atrasados = listaPendientes.filter((p) => fechaPasada(p.fecha_estimada))

  const puedePedir = rol === 'admin' || rol === 'supervisor'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">🏭 Depósito</h1>
      <p className="text-gray-500 text-sm mt-1">
        {rol ? `Entraste como ${NOMBRE_ROL[rol]}.` : 'Tu usuario todavía no tiene un rol asignado.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-[#161922] rounded-lg p-4">
          <p className="text-gray-500 text-xs">Vencimientos (próximos {DIAS_ALERTA_VENCIMIENTO} días)</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              vencidos > 0 ? 'text-red-400' : porVencer.length > 0 ? 'text-yellow-400' : 'text-green-400'
            }`}
          >
            {porVencer.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {vencidos > 0 ? `${vencidos} ya vencidos` : 'Ninguno vencido'}
          </p>
        </div>

        <div className="bg-[#161922] rounded-lg p-4">
          <p className="text-gray-500 text-xs">Stock bajo</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              bajos.length > 0 ? 'text-yellow-400' : 'text-green-400'
            }`}
          >
            {bajos.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">Productos en el mínimo o por debajo</p>
        </div>

        <div className="bg-[#161922] rounded-lg p-4">
          <p className="text-gray-500 text-xs">Pedidos pendientes de recibir</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              atrasados.length > 0 ? 'text-red-400' : 'text-white'
            }`}
          >
            {listaPendientes.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {atrasados.length > 0 ? `${atrasados.length} atrasados` : 'Ninguno atrasado'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-6">
        <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium">Vencimientos próximos</h2>
            <Link href="/inventario" className="text-xs text-blue-400 hover:text-blue-300">
              Ver inventario
            </Link>
          </div>
          {porVencer.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No hay lotes vencidos ni por vencer en los próximos {DIAS_ALERTA_VENCIMIENTO} días.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2">Lote</th>
                    <th className="pb-2">Vence</th>
                    <th className="pb-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {porVencer.slice(0, MAXIMO_EN_LISTA).map(({ lote, producto, dias }) => (
                    <tr key={lote.id} className="border-b border-gray-800">
                      <td className="py-2 text-gray-200">{producto.nombre}</td>
                      <td className="py-2 text-gray-400">{lote.nro_lote ?? 'sin número'}</td>
                      <td
                        className={`py-2 ${
                          dias < 0 ? 'text-red-400' : dias <= 7 ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        {formatearVencimiento(lote.vencimiento)}
                        <span className="block text-xs">{textoDias(dias)}</span>
                      </td>
                      <td className="py-2 text-gray-300">
                        {formatearStock(lote.cantidad_actual, producto.unidades_por_bulto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {porVencer.length > MAXIMO_EN_LISTA && (
                <p className="text-gray-600 text-xs mt-2">
                  y {porVencer.length - MAXIMO_EN_LISTA} más
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium">Stock bajo</h2>
            {puedePedir && (
              <Link href="/que-pedir" className="text-xs text-blue-400 hover:text-blue-300">
                Ir a Qué pedir
              </Link>
            )}
          </div>
          {bajos.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Ningún producto está en el mínimo. Solo se controlan los que tienen cargado el stock
              mínimo.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {bajos.slice(0, MAXIMO_EN_LISTA).map((b) => (
                    <tr key={b.producto.id} className="border-b border-gray-800">
                      <td className="py-2 text-gray-200">{b.producto.nombre}</td>
                      <td className={`py-2 ${b.stock === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {formatearStock(b.stock, b.producto.unidades_por_bulto)}
                      </td>
                      <td className="py-2 text-gray-400">{b.minimo} u</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bajos.length > MAXIMO_EN_LISTA && (
                <p className="text-gray-600 text-xs mt-2">y {bajos.length - MAXIMO_EN_LISTA} más</p>
              )}
            </>
          )}
        </div>

        <div className="bg-[#161922] rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium">Pedidos pendientes de recibir</h2>
            <Link href="/recepcion" className="text-xs text-blue-400 hover:text-blue-300">
              Ir a Recepción
            </Link>
          </div>
          {listaPendientes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay pedidos pendientes de recibir.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-2">Pedido</th>
                  <th className="pb-2">Proveedor</th>
                  <th className="pb-2">Llegada estimada</th>
                </tr>
              </thead>
              <tbody>
                {listaPendientes.slice(0, MAXIMO_EN_LISTA).map((p) => {
                  const atrasado = fechaPasada(p.fecha_estimada)
                  return (
                    <tr key={p.id} className="border-b border-gray-800">
                      <td className="py-2 text-gray-200">{formatearNumeroPedido(p.numero)}</td>
                      <td className="py-2 text-gray-400">{p.proveedor_nombre}</td>
                      <td className={`py-2 ${atrasado ? 'text-red-400' : 'text-gray-300'}`}>
                        {formatearFecha(p.fecha_estimada)}
                        {atrasado && <span className="block text-xs">Atrasado</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
