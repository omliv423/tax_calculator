self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}

  event.waitUntil(
    self.registration.showNotification(data.title || '税金計算をしませんか？', {
      body: data.body || '最新の税制情報で手取りをチェック',
      tag: 'tax-calc-update',
      renotify: false,
      silent: true,
    })
  )

  // バッジを付ける
  if (navigator.setAppBadge) {
    navigator.setAppBadge()
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  // バッジを消す
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge()
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes('/chat') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/chat')
    })
  )
})
