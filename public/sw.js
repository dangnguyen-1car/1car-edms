// public/sw.js
self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  // event.waitUntil(self.skipWaiting()); // Bỏ qua waiting phase nếu muốn active ngay
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  // event.waitUntil(self.clients.claim()); // Kiểm soát các client ngay lập tức
});

self.addEventListener('fetch', (event) => {
  // console.log('SW: Fetching', event.request.url);
  // Hiện tại chưa làm gì, chỉ để pass-through
  // event.respondWith(fetch(event.request));
});