import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export function navigateTo(router: AppRouterInstance, path: string) {
  sessionStorage.setItem('nav_time', String(Date.now()))
  router.push(path)
}

export function replaceTo(router: AppRouterInstance, path: string) {
  sessionStorage.setItem('nav_time', String(Date.now()))
  router.replace(path)
}
