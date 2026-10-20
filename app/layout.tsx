import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata = {
  title: 'Depósito',
  description: 'Control de stock, pedidos y recepción de mercadería',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
