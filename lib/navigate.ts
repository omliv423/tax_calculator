import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export function navigateTo(router: AppRouterInstance, path: string) {
  sessionStorage.setItem('navigating', 'true')
  router.push(path)
}

export function replaceTo(router: AppRouterInstance, path: string) {
  sessionStorage.setItem('navigating', 'true')
  router.replace(path)
}
