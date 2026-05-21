import type { Metadata, Viewport } from "next"
import { Geist_Mono, Outfit, Montserrat } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PwaRegister } from "@/components/pwa-register"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN
  return {
    title: domain ? `Mail — ${domain}` : "Mail",
    description: domain ? `Personal email client for ${domain}` : "Self-hosted email client",
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.ico",
      apple: "/icon-192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Mail",
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14191f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

const montserratHeading = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
})

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        outfit.variable,
        montserratHeading.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
