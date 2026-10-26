// Service Worker：为静态前端提供离线能力
// 策略：HTML/CSS/JS 网络优先（保证部署后拿到新版本），失败回退缓存；
//      API 请求始终直连网络，离线场景由应用层的待同步队列兜底。
const CACHE_VERSION = 'kegel-static-v2';

const PRECACHE_URLS = [
    './',
    'index.html',
    'style.css',
    'config.js',
    'utils.js',
    'api-client.js',
    'script.js',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_VERSION)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// HTML 引用资源带 ?v= 版本号，缓存键统一去掉查询串
function cacheKey(request) {
    const url = new URL(request.url);
    return url.origin + url.pathname;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') return;

    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response && response.ok) {
                const cache = await caches.open(CACHE_VERSION);
                cache.put(cacheKey(request), response.clone());
            }
            return response;
        } catch (error) {
            const cached = await caches.match(cacheKey(request));
            if (cached) return cached;
            // 离线打开站点时回退到已缓存的入口页
            if (request.mode === 'navigate') {
                const index = await caches.match('index.html');
                if (index) return index;
            }
            return Response.error();
        }
    })());
});
