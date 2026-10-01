import type { Metadata } from 'next'
import '../src/index.css'
import '../src/App.css'
import '../src/styles/admin.css'
import 'leaflet/dist/leaflet.css'

export const metadata: Metadata = {
  title: 'Northstar Freight',
  description: 'Freight coordination and shipment tracking.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}