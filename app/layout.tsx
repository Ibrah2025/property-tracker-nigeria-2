import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ServiceWorkerRegistration from "./ServiceWorkerRegistration"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Property Tracker",
  description: "Nigerian Property Development Manager",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} overscroll-none`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
