importScripts("./controller.sw.js");

addEventListener("fetch", function (e) {
  if ($scramjetController.shouldRoute(e)) {
    e.respondWith($scramjetController.route(e));
  }
});