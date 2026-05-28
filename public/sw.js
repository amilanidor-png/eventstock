self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  const clients = await self.clients.matchAll()
  clients.forEach(c => c.navigate(c.url))
  self.registration.unregister()
})