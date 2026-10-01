const CACHE_NAME = "sanistock-v4";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Ne jamais mettre Apps Script en cache
  if (
    request.url.includes("script.google.com") ||
    request.url.includes("googleusercontent.com")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
    );
    return;
  }

  // Toujours essayer de récupérer la nouvelle version de SaniStock
  if (
    request.mode === "navigate" ||
    request.url.endsWith("/index.html")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          const copie = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put("./index.html", copie);
          });

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request).then(response => {
        if (response && response.ok) {
          const copie = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copie);
          });
        }

        return response;
      });
    })
  );
});
