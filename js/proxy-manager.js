// proxy-manager.js - Manages Scramjet proxy for external sites

class ProxyManager {
    constructor() {
        this.scramjetUrl = 'https://scramjet.mercurywork.shop/'; // Online Scramjet instance
        this.proxiedUrls = new Map();
    }

    async initialize() {
        // Online Scramjet doesn't need local initialization
        return Promise.resolve();
    }

    proxyUrl(url) {
        // For online Scramjet, we'll navigate the iframe directly
        // The iframe will handle the proxying internally
        return `${this.scramjetUrl}?url=${encodeURIComponent(url)}`;
    }

    createProxiedIframe(url, container) {
        const iframe = document.createElement('iframe');
        iframe.src = this.proxyUrl(url);
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        container.appendChild(iframe);
        return iframe;
    }

    isExternalUrl(url) {
        const currentOrigin = window.location.origin;
        return !url.startsWith(currentOrigin) && !url.startsWith('/');
    }

    handleExternalLink(url) {
        if (this.isExternalUrl(url)) {
            return this.proxyUrl(url);
        }
        return url;
    }
}

// Global instance
window.proxyManager = new ProxyManager();