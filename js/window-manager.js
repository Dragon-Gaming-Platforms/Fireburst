// window-manager.js - Extended window manager for native and proxy apps

class ExtendedWindowManager {
    constructor(baseManager) {
        this.baseManager = baseManager;
        this.nativeWindows = new Map();
        this.proxyWindows = new Map();
        this.canvasWindows = new Map();
    }

    createNativeWindow(title, width, height, appType = 'native') {
        const window = this.baseManager.createWindow(title, width, height);
        window.appType = appType;

        if (appType === 'native') {
            // For native apps, prepare canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.style.cssText = `
                width: 100%;
                height: 100%;
                background: black;
            `;
            window.content.appendChild(canvas);
            window.canvas = canvas;
            this.nativeWindows.set(window.id, window);
        }

        return window;
    }

    createProxyWindow(title, url, width, height) {
        const window = this.baseManager.createWindow(title, width, height);
        window.appType = 'proxy';

        // Use proxy manager to create iframe
        window.proxyIframe = window.proxyManager.createProxiedIframe(url, window.content);
        this.proxyWindows.set(window.id, window);

        return window;
    }

    createAIAssistantWindow(title = 'AI Assistant', width = 800, height = 600) {
        const window = this.baseManager.createWindow(title, width, height);
        window.appType = 'ai';

        // Launch AI assistant
        window.aiInterface = window.browserCodeManager.launchAssistant(window.content);

        return window;
    }

    getWindowById(id) {
        return this.nativeWindows.get(id) || this.proxyWindows.get(id) || this.baseManager.getWindowById(id);
    }

    closeWindow(id) {
        const window = this.getWindowById(id);
        if (window) {
            if (window.appType === 'native') {
                this.nativeWindows.delete(id);
            } else if (window.appType === 'proxy') {
                this.proxyWindows.delete(id);
            }
        }
        this.baseManager.closeWindow(id);
    }

    // Extend base manager methods
    createWindow(...args) {
        return this.baseManager.createWindow(...args);
    }

    // Add indicators for different app types
    updateWindowIndicators() {
        // Add visual indicators for app types
        this.nativeWindows.forEach(window => {
            this.addAppTypeIndicator(window, 'native');
        });
        this.proxyWindows.forEach(window => {
            this.addAppTypeIndicator(window, 'proxy');
        });
    }

    addAppTypeIndicator(window, type) {
        const indicator = document.createElement('div');
        indicator.className = `app-type-indicator ${type}`;
        indicator.textContent = type.toUpperCase();
        indicator.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            background: ${type === 'native' ? '#4CAF50' : type === 'proxy' ? '#2196F3' : '#FF9800'};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            z-index: 1000;
        `;
        window.element.appendChild(indicator);
    }
}

// Initialize extended window manager
if (window.osWindowManager) {
    window.extendedWindowManager = new ExtendedWindowManager(window.osWindowManager);
} else {
    // Fallback if base manager not ready
    window.extendedWindowManager = {
        createNativeWindow: () => console.log('Window manager not initialized'),
        createProxyWindow: () => console.log('Window manager not initialized'),
        createAIAssistantWindow: () => console.log('Window manager not initialized'),
    };
}