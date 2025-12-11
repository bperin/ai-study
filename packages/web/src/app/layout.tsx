import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import "@copilotkit/react-ui/styles.css";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Memorang AI Study',
  description: 'AI-powered study assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}