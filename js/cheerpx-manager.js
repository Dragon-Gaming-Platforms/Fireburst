// cheerpx-manager.js - Manages CheerpX Linux environment integration

const CHEERPX_BASE_URL = (() => {
    const scriptUrl = (document.currentScript && document.currentScript.src) ? document.currentScript.src : window.location.href;
    return new URL('../vendor/cheerpx/', scriptUrl).href;
})();

class CheerpXManager {
    constructor() {
        this.cx = null;
        this.isInitialized = false;
        this.nativeApps = new Map();
        this.fileSystemBridge = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Import CheerpX from local vendor files
            const CheerpX = await import(new URL('cx.esm.js', CHEERPX_BASE_URL).href);

            // Set up a local CheerpX disk image served from the repo
            const rootDiskPath = new URL('cheerpXImage.ext2', CHEERPX_BASE_URL).href;
            let imageDevice;
            try {
                imageDevice = await CheerpX.HttpBytesDevice.create(rootDiskPath);
            } catch (rootImageError) {
                throw new Error(`Failed to load CheerpX root image at ${rootDiskPath}: ${rootImageError.message}`);
            }
            const idbDevice = await CheerpX.IDBDevice.create("cheerpx-block");
            const overlayDevice = await CheerpX.OverlayDevice.create(imageDevice, idbDevice);

            // Create web device for file sharing
            const webDevice = await CheerpX.WebDevice.create();
            const dataDevice = await CheerpX.WebDevice.create();

            // Create CheerpX Linux instance with a raw local ext2 root image
            this.cx = await CheerpX.Linux.create({
                mounts: [
                    { type: "ext2", path: "/", dev: overlayDevice },
                    { type: "dir", path: "/app", dev: webDevice },
                    { type: "dir", path: "/data", dev: dataDevice },
                    { type: "devs", path: "/dev" },
                    { type: "devpts", path: "/dev/pts" },
                    { type: "proc", path: "/proc" },
                ],
            });

            // Set up file system bridge with VFS
            this.setupFileSystemBridge(webDevice, dataDevice);

            this.isInitialized = true;
            console.log('CheerpX initialized successfully');
        } catch (error) {
            console.error('Failed to initialize CheerpX:', error);
            throw error;
        }
    }

    setupFileSystemBridge(webDevice, dataDevice) {
        // Bridge between CheerpX filesystem and OS VFS
        this.fileSystemBridge = {
            webDevice,
            dataDevice,
            async uploadFile(file) {
                // Upload file to CheerpX filesystem
                const buffer = await file.arrayBuffer();
                await webDevice.writeFile('/app/' + file.name, new Uint8Array(buffer));
            },
            async downloadFile(path) {
                // Download file from CheerpX filesystem
                const data = await webDevice.readFile(path);
                return new Blob([data]);
            }
        };
    }

    async runNativeApp(appPath, args = []) {
        if (!this.isInitialized) await this.initialize();

        try {
            const process = await this.cx.run(appPath, args, {
                env: [
                    "HOME=/home/user",
                    "USER=user",
                    "SHELL=/bin/bash",
                    "LANG=en_US.UTF-8",
                    "LC_ALL=C",
                    "DISPLAY=:0", // For X11
                ],
                cwd: "/home/user",
                uid: 1000,
                gid: 1000,
            });

            return process;
        } catch (error) {
            console.error('Failed to run native app:', error);
            throw error;
        }
    }

    async runELF(file) {
        // Upload ELF file and run it
        await this.fileSystemBridge.uploadFile(file);
        return this.runNativeApp('/app/' + file.name);
    }

    async runWine(exeFile) {
        // Upload EXE file and run with Wine
        await this.fileSystemBridge.uploadFile(exeFile);
        return this.runNativeApp('/usr/bin/wine', ['/app/' + exeFile.name]);
    }

    async createTerminal(container) {
        if (!this.isInitialized) await this.initialize();

        // Create a terminal interface
        const terminal = document.createElement('pre');
        terminal.style.cssText = `
            width: 100%;
            height: 100%;
            background: black;
            color: white;
            font-family: monospace;
            padding: 10px;
            overflow: auto;
        `;
        container.appendChild(terminal);

        // Set console to the terminal
        this.cx.setConsole(terminal);

        // Start bash
        await this.runNativeApp('/bin/bash', ['--login']);

        return terminal;
    }

    async setupX11(container) {
        // For GUI apps, set up X11 display
        // This would require additional setup for X11 forwarding
        // For now, console-based apps only
    }

    getFileSystemBridge() {
        return this.fileSystemBridge;
    }
}

// Global instance
window.cheerpXManager = new CheerpXManager();