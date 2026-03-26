import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BDWkbD2GAEBQVdCN67tEFwOQPN2qXYjIceEeLEd4YyA-ETafSlTLQPVC_cB4f68kuZPJPjxnDBriPmhELsvm4Mw'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerPushSubscription(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const subscription = await registration.pushManager.subscribe({
      userVisuallyShown: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscription.toJSON(),
    }, { onConflict: 'user_id,subscription' })
  } catch (e) {
    console.error('Push registration failed:', e)
  }
}

export async function clearBadge() {
  if (navigator.clearAppBadge) {
    await navigator.clearAppBadge()
  }
}
