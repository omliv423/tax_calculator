'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

let hasLaunched = false

export default function PwaRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasLaunched) {
      hasLaunched = true
      if (pathname !== '/') {
        router.replace('/')
      }
    }
  }, [])

  return null
}
