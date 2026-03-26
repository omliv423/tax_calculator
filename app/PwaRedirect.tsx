'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function PwaRedirect() {
  const pathname = usePathname()

  useEffect(() => {
    // 初回ロード時：計算ページ以外なら強制リダイレクト
    if (pathname !== '/') {
      window.location.replace('/')
      return
    }

    // PWAがbfcacheから復元された場合も計算ページに戻す
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && window.location.pathname !== '/') {
        window.location.replace('/')
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
