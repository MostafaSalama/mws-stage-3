const CACHE_NAME = 'restaurants-v6';
const filesToCahce = [
    '/img/smallimg/1.jpg',
    '/img/smallimg/2.jpg',
    '/img/smallimg/3.jpg',
    '/img/smallimg/4.jpg',
    '/img/smallimg/5.jpg',
    '/img/smallimg/6.jpg',
    '/img/smallimg/7.jpg',
    '/img/smallimg/8.jpg',
    '/img/smallimg/9.jpg',
    '/img/smallimg/10.jpg',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
    '/dist/mainIndex.min.js',
    '/dist/restaurant.min.js',
    '/icons/favicon.png',
    '/icons/plate-fork-and-knife50x50.png',
    '/icons/plate-fork-and-knife128x128.png',
    '/icons/plate-fork-and-knife152x152.png',
    '/icons/plate-fork-and-knife192x192.png',
    '/icons/plate-fork-and-knife512.png',
    '/index.html',
    '/restaurant.html?id=1',
    '/restaurant.html?id=2',
    '/restaurant.html?id=3',
    '/restaurant.html?id=4',
    '/restaurant.html?id=5',
    '/restaurant.html?id=6',
    '/restaurant.html?id=7',
    '/restaurant.html?id=8',
    '/restaurant.html?id=9',
    '/restaurant.html?id=10',
    '/'
];
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(filesToCahce);
        })
    );
});
self.addEventListener('fetch', event => {
        event.respondWith(
            caches.match(event.request).then(res => {
                return (
                    res ||
                    fetch(event.request).then(response => {
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.add(event.request, response.clone());
                            return response;
                        });
                    }).catch(()=>{
                        return caches.match('/index.html')
                    })
                );
            })
        );

});
self.addEventListener('activate', function(event) {

    var cacheWhitelist = [CACHE_NAME];// Version for your cache list

    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});