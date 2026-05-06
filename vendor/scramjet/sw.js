importScripts("./controller.sw.js");

addEventListener("install", function (e) {
  skipWaiting();
});

addEventListener("activate", function (e) {
  e.waitUntil(clients.claim());
});

addEventListener("fetch", function (e) {
  if ($scramjetController.shouldRoute(e)) {
    e.respondWith($scramjetController.route(e));
  }
});