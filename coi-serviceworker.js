/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, MIT license */
let coepCredentialless = false;

if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());

    self.addEventListener("activate", (event) => {
        event.waitUntil(self.clients.claim());
    });

    self.addEventListener("message", (event) => {
        if (!event.data) return;

        if (event.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => self.clients.matchAll())
                .then((clients) => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (event.data.type === "coepCredentialless") {
            coepCredentialless = event.data.value;
        }
    });

    self.addEventListener("fetch", (event) => {
        const originalRequest = event.request;
        if (originalRequest.cache === "only-if-cached" && originalRequest.mode !== "same-origin") {
            return;
        }

        const request = coepCredentialless && originalRequest.mode === "no-cors"
            ? new Request(originalRequest, { credentials: "omit" })
            : originalRequest;

        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) return response;

                    const headers = new Headers(response.headers);
                    headers.set(
                        "Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp"
                    );

                    if (!coepCredentialless) {
                        headers.set("Cross-Origin-Resource-Policy", "cross-origin");
                    }

                    headers.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers
                    });
                })
                .catch((error) => console.error(error))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = reloadedBySelf === "coepdegrade";

        const coi = {
            shouldRegister: () => !reloadedBySelf,
            shouldDeregister: () => false,
            coepCredentialless: () => true,
            coepDegrade: () => true,
            doReload: () => window.location.reload(),
            quiet: false,
            ...window.coi
        };

        const navigatorRef = navigator;
        const controlling = navigatorRef.serviceWorker && navigatorRef.serviceWorker.controller;

        if (controlling && !window.crossOriginIsolated) {
            window.sessionStorage.setItem("coiCoepHasFailed", "true");
        }

        const coepHasFailed = window.sessionStorage.getItem("coiCoepHasFailed");

        if (controlling) {
            const reloadToDegrade = coi.coepDegrade() && !(coepDegrading || window.crossOriginIsolated);
            navigatorRef.serviceWorker.controller.postMessage({
                type: "coepCredentialless",
                value: reloadToDegrade || (coepHasFailed && coi.coepDegrade())
                    ? false
                    : coi.coepCredentialless()
            });

            if (reloadToDegrade) {
                if (!coi.quiet) console.log("Reloading page to degrade COEP.");
                window.sessionStorage.setItem("coiReloadedBySelf", "coepdegrade");
                coi.doReload("coepdegrade");
            }

            if (coi.shouldDeregister()) {
                navigatorRef.serviceWorker.controller.postMessage({ type: "deregister" });
            }
        }

        if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

        if (!window.isSecureContext) {
            if (!coi.quiet) {
                console.log("COOP/COEP Service Worker not registered, a secure context is required.");
            }
            return;
        }

        if (!navigatorRef.serviceWorker) {
            if (!coi.quiet) {
                console.error("COOP/COEP Service Worker not registered, perhaps due to private mode.");
            }
            return;
        }

        navigatorRef.serviceWorker.register(window.document.currentScript.src).then(
            (registration) => {
                if (!coi.quiet) console.log("COOP/COEP Service Worker registered", registration.scope);

                registration.addEventListener("updatefound", () => {
                    if (!coi.quiet) {
                        console.log("Reloading page to make use of updated COOP/COEP Service Worker.");
                    }
                    window.sessionStorage.setItem("coiReloadedBySelf", "updatefound");
                    coi.doReload();
                });

                if (registration.active && !navigatorRef.serviceWorker.controller) {
                    if (!coi.quiet) {
                        console.log("Reloading page to make use of COOP/COEP Service Worker.");
                    }
                    window.sessionStorage.setItem("coiReloadedBySelf", "notcontrolling");
                    coi.doReload();
                }
            },
            (error) => {
                if (!coi.quiet) {
                    console.error("COOP/COEP Service Worker failed to register:", error);
                }
            }
        );
    })();
}
