import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🌻 SFL Portfolio',
  description: 'Sunflower Land Portfolio Tracker — Transactions, Cash Flow & NFT Analytics',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pixel-bg text-pixel-text min-h-screen">
        {/* CRT Scanline overlay */}
        <div className="crt-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
