self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}

  const showNotif = self.registration.showNotification(data.title || '税金計算をしませんか？', {
    body: data.body || '最新の税制情報で手取りをチェック',
    tag: 'tax-calc-update',
    renotify: false,
    silent: true,
    badge: '/icon-192.png',
  })

  const setBadge = self.navigator && self.navigator.setAppBadge
    ? self.navigator.setAppBadge(1)
    : Promise.resolve()

  event.waitUntil(Promise.all([showNotif, setBadge]))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const clearBadge = self.navigator && self.navigator.clearAppBadge
    ? self.navigator.clearAppBadge()
    : Promise.resolve()

  event.waitUntil(
    clearBadge.then(function () {
      return clients.matchAll({ type: 'window' }).then(function (clientList) {
        for (const client of clientList) {
          if (client.url.includes('/chat') && 'focus' in client) {
            return client.focus()
          }
        }
        return clients.openWindow('/chat')
      })
    })
  )
})
