(function () {
  const WISP_URL = "wss://wisp.mercurywork.shop/";

  const urlInput = document.getElementById("url");
  const frameEl = document.getElementById("frame");
  const statusEl = document.getElementById("status");

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function normalizeUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
      ? trimmed
      : "https://" + trimmed;
  }

  async function waitForControllerOrReady(timeoutMs) {
    if (navigator.serviceWorker.controller) return;

    const ready = navigator.serviceWorker.ready.then(function () {});
    const controllerChanged = new Promise(function (resolve) {
      const onChange = function () {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange, { once: true });
    });
    const timeout = new Promise(function (resolve) {
      setTimeout(resolve, timeoutMs);
    });

    await Promise.race([ready, controllerChanged, timeout]);
  }

  async function boot() {
    setStatus("Registering service worker…");
    await navigator.serviceWorker.register("./sw.js", { scope: "./" });

    setStatus("Waiting for service worker…");
    await waitForControllerOrReady(10000);

    const sw = navigator.serviceWorker.controller;
    if (!sw) {
      setStatus("Service worker not controlling page. Try hard refresh.");
      return;
    }

    if (!globalThis.LibcurlTransport || !globalThis.LibcurlTransport.LibcurlClient) {
      setStatus("libcurl transport failed to load.");
      return;
    }
    if (!globalThis.$scramjet) {
      setStatus("Scramjet failed to load.");
      return;
    }
    if (!globalThis.$scramjetController || !$scramjetController.Controller) {
      setStatus("Scramjet controller failed to load.");
      return;
    }

    const transport = new LibcurlTransport.LibcurlClient({ websocket: WISP_URL });

    setStatus("Initializing controller…");
    const controller = new $scramjetController.Controller({
      serviceworker: sw,
      transport: transport,
      config: {
        scramjetPath: new URL("./scramjet_bundled.js", location.href).toString(),
        injectPath: new URL("./controller.inject.js", location.href).toString(),
        wasmPath: new URL("./scramjet.wasm", location.href).toString(),
      },
      scramjetConfig: $scramjet.defaultConfigDev,
    });

    await controller.wait();

    const frame = controller.createFrame(frameEl);
    setStatus("Ready");

    function navigate() {
      const target = normalizeUrl(urlInput.value);
      if (!target) return;
      frame.go(target);
    }

    document.getElementById("go").addEventListener("click", navigate);
    urlInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") navigate();
    });

    navigate();
  }

  boot().catch(function (err) {
    console.error(err);
    setStatus("Boot failed: " + (err && err.message ? err.message : String(err)));
  });
})();