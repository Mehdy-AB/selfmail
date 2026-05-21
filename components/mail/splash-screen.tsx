"use client"

import { useEffect, useState } from "react"

interface SplashScreenProps {
  visible: boolean
}

export function SplashScreen({ visible }: SplashScreenProps) {
  const [rendered, setRendered] = useState(true)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setRendered(false), 500)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!rendered) return null

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-black transition-opacity duration-500"
      style={{ zIndex: 9999, opacity: visible ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mail_icon.png"
          alt="Mail"
          width={56}
          height={56}
          className="shadow-lg"
        />
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-white">Mail</p>
          {process.env.NEXT_PUBLIC_APP_DOMAIN && (
            <p className="text-sm text-white/50">{process.env.NEXT_PUBLIC_APP_DOMAIN}</p>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-white/40"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
