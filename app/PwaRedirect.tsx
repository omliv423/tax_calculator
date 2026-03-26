'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function PwaRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const alreadyRedirected = sessionStorage.getItem('launched')

    if (isStandalone && !alreadyRedirected) {
      sessionStorage.setItem('launched', 'true')
      router.replace('/')
    }
  }, [])

  return null
}
