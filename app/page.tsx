import { obtenerRol } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const NOMBRE_ROL = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operario: 'Operario',
} as const

export default async function Dashboard() {
  const rol = await obtenerRol()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">🏭 Depósito</h1>
      <p className="text-gray-500 text-sm mt-1">
        {rol ? `Entraste como ${NOMBRE_ROL[rol]}.` : 'Tu usuario todavía no tiene un rol asignado.'}
      </p>

      <div className="bg-[#161922] rounded-lg p-6 mt-8 max-w-xl">
        <p className="text-gray-300 text-sm font-medium mb-2">Base lista ✅</p>
        <p className="text-gray-500 text-sm">
          El inicio de sesión y los roles ya funcionan. Los módulos de inventario, proveedores, pedidos,
          recepción y salidas se van sumando de a uno.
        </p>
      </div>
    </div>
  )
}
