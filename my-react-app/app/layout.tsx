import type { Metadata } from 'next'
import '../src/index.css'
import '../src/App.css'
import '../src/styles/admin.css'
import 'leaflet/dist/leaflet.css'

export const metadata: Metadata = {
  title: 'Global Prime Logistics | Real-Time Freight Tracking & Dispatch',
  description: 'Global Prime Logistics — Multi-modal freight forwarding, real-time satellite GPS tracking, priority air freight, ocean maritime corridors, and overland logistics.',
  icons: {
    icon: '/brand-logo.jfif',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}