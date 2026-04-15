import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mikro Muhasebe',
  description: 'Modern Multi-Tenant Stok Yönetim Uygulaması',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#FAFAF7',
              color: '#2d332f',
              border: '1px solid #e0e0d9',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
            success: {
              iconTheme: {
                primary: '#5D866C',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#c45e5e',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
