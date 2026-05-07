// proxy-manager.js - Manages Scramjet proxy for external sites

class ProxyManager {
    constructor() {
        this.scramjetUrl = 'vendor/scramjet/'; // Relative path to Scramjet
        this.proxiedUrls = new Map();
    }

    async initialize() {
        // Scramjet is already included, just ensure it's loaded
        if (!window.scramjet) {
            await this.loadScramjet();
        }
    }

    async loadScramjet() {
        // Load Scramjet scripts
        const scripts = [
            'vendor/scramjet/app.js',
            'vendor/scramjet/sw.js'
        ];

        for (const script of scripts) {
            await this.loadScript(script);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    proxyUrl(url) {
        // Use Scramjet to proxy the URL
        if (window.scramjet && window.scramjet.encodeUrl) {
            return window.scramjet.encodeUrl(url);
        }
        // Fallback: use a simple proxy pattern
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