const CACHE_NAME = 'taxi-expenses-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap'
];

// Установка: кэшируем критические ресурсы
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Кэширование базовых ресурсов');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Активируем новый SW сразу
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim(); // Берём контроль над всеми вкладками
});

// Перехват запросов: Cache First для статики, Network First для API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Для внешних CDN используем Stale-While-Revalidate
    if (url.origin.includes('cdn.jsdelivr.net') || 
        url.origin.includes('cdnjs.cloudflare.com') || 
        url.origin.includes('fonts.googleapis.com') || 
        url.origin.includes('fonts.gstatic.com')) {
        
        event.respondWith(
            caches.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached); // Если сеть упала, отдаём кэш
                
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Для локальных файлов — Cache First
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request);
        })
    );
});
