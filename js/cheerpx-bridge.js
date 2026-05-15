// cheerpx-bridge.js - Bridge for postMessage communication with isolated CheerpX runner
// This replaces the direct cheerpx-manager.js integration
// CheerpX now runs in a separate window/tab with cross-origin isolation (COOP/COEP)

class CheerpXBridge {
    constructor(runnerUrl = 'cheerpx-runner.html') {
        this.runnerUrl = runnerUrl;
        this.runnerWindow = null;
        this.isConnected = false;
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.connectionTimeout = 5000;
        this.messageHandlers = {};
        this.autoReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    /**
     * Open the CheerpX runner window
     * @param {Object} options - Window options
     * @returns {Promise<boolean>} - Success status
     */
    async open(options = {}) {
        const defaultOptions = {
            width: options.width || 800,
            height: options.height || 600,
            left: options.left !== undefined ? options.left : (window.innerWidth - 800) / 2,
            top: options.top !== undefined ? options.top : (window.innerHeight - 600) / 2,
        };

        try {
            const windowFeatures = `width=${defaultOptions.width},height=${defaultOptions.height},left=${defaultOptions.left},top=${defaultOptions.top},resizable=yes,scrollbars=yes`;
            this.runnerWindow = window.open(this.runnerUrl, 'cheerpx-runner', windowFeatures);

            if (!this.runnerWindow) {
                throw new Error('Failed to open CheerpX runner window - popup may be blocked');
            }

            // Wait for runner to connect
            return await this.waitForConnection();
        } catch (error) {
            console.error('Failed to open CheerpX runner:', error);
            return false;
        }
    }

    /**
     * Close the CheerpX runner window
     */
    close() {
        if (this.runnerWindow && !this.runnerWindow.closed) {
            this.runnerWindow.close();
        }
        this.runnerWindow = null;
        this.isConnected = false;
    }

    /**
     * Wait for connection to be established
     * @returns {Promise<boolean>}
     */
    async waitForConnection() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('CheerpX runner connection timeout');
                resolve(false);
            }, this.connectionTimeout);

            this.once('initialized', () => {
                clearTimeout(timeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                resolve(true);
            });
        });
    }

    /**
     * Send a message to the runner and wait for response
     * @param {string} action - Action to perform
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} - Response from runner
     */
    async execute(action, data = {}) {
        if (!this.isConnected) {
            throw new Error('CheerpX runner not connected');
        }

        if (!this.runnerWindow || this.runnerWindow.closed) {
            if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect to CheerpX runner (attempt ${this.reconnectAttempts})`);
                const connected = await this.open();
                if (!connected) {
                    throw new Error('Failed to reconnect to CheerpX runner');
                }
            } else {
                throw new Error('CheerpX runner window is closed');
            }
        }

        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`CheerpX request timeout: ${action}`));
            }, 10000); // 10 second timeout

            this.pendingRequests.set(requestId, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            this.runnerWindow.postMessage({
                source: 'fireburst-os',
                id: requestId,
                action: action,
                data: data,
                timestamp: Date.now()
            }, '*');
        });
    }

    /**
     * Execute a command in the CheerpX Linux environment
     * @param {string} command - Shell command to execute
     * @returns {Promise<Object>} - Command result
     */
    async executeCommand(command) {
        return this.execute('execute', { command });
    }

    /**
     * Upload a file to CheerpX filesystem
     * @param {File} file - File to upload
     * @param {string} remotePath - Path in CheerpX filesystem
     * @returns {Promise<Object>}
     */
    async uploadFile(file, remotePath = '/tmp/') {
        const buffer = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const payload = btoa(binary);
        return this.execute('uploadFile', {
            file: { data: payload, type: file.type || 'application/octet-stream' },
            filename: file.name,
            remotePath: remotePath
        });
    }

    /**
     * Download a file from CheerpX filesystem
     * @param {string} filepath - Path in CheerpX filesystem
     * @returns {Promise<Object>}
     */
    async downloadFile(filepath) {
        return this.execute('downloadFile', { filepath });
    }

    /**
     * Run a native application (ELF binary)
     * @param {string} filepath - Path to the binary
     * @param {Array} args - Command line arguments
     * @returns {Promise<Object>}
     */
    async runNativeApp(filepath, args = []) {
        return this.execute('runELF', {
            filepath: filepath,
            args: args
        });
    }

    /**
     * Run a Windows application through Wine
     * @param {string} exePath - Path to the .exe file
     * @param {Array} args - Command line arguments
     * @returns {Promise<Object>}
     */
    async runWindowsApp(exePath, args = []) {
        return this.execute('runWine', {
            filepath: exePath,
            args: args
        });
    }

    /**
     * Ping the runner to check connection
     * @returns {Promise<boolean>}
     */
    async ping() {
        try {
            const response = await this.execute('ping');
            return response && response.action === 'pong';
        } catch (error) {
            return false;
        }
    }

    /**
     * Listen for a single message from runner
     * @param {string} action - Action type to listen for
     * @returns {Promise<Object>}
     */
    once(action, callback) {
        const handler = (event) => {
            const message = event.data;
            if (message.source === 'cheerpx-runner' && message.action === action) {
                window.removeEventListener('message', handler);
                if (callback) callback(message);
            }
        };
        window.addEventListener('message', handler);
    }

    /**
     * Listen for messages from runner
     * @param {string} action - Action type to listen for
     * @param {Function} callback - Callback function
     * @returns {Function} - Function to stop listening
     */
    on(action, callback) {
        if (!this.messageHandlers[action]) {
            this.messageHandlers[action] = [];
        }

        this.messageHandlers[action].push(callback);

        // Return unsubscribe function
        return () => {
            this.messageHandlers[action] = this.messageHandlers[action].filter(cb => cb !== callback);
        };
    }

    /**
     * Initialize message listener
     * @private
     */
    _initializeMessageListener() {
        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.source !== 'cheerpx-runner') return;

            // Handle pending requests
            if (message.id && this.pendingRequests.has(message.id)) {
                const request = this.pendingRequests.get(message.id);
                this.pendingRequests.delete(message.id);

                if (message.error) {
                    request.reject(new Error(message.error));
                } else {
                    request.resolve(message);
                }
            }

            // Handle message handlers
            if (this.messageHandlers[message.action]) {
                this.messageHandlers[message.action].forEach(callback => {
                    try {
                        callback(message);
                    } catch (error) {
                        console.error(`Error in message handler for ${message.action}:`, error);
                    }
                });
            }

            // Handle special messages
            switch (message.action) {
                case 'initialized':
                    console.log('✓ CheerpX runner initialized');
                    break;

                case 'error':
                    console.error('CheerpX Error:', message.error);
                    break;

                case 'appExecuted':
                    console.log(`App execution completed: ${message.filepath}`);
                    break;
            }
        });
    }
}

// Initialize bridge
const cheerpxBridge = new CheerpXBridge();
cheerpxBridge._initializeMessageListener();

// Expose globally for OS integration
window.CheerpXBridge = CheerpXBridge;

window.cheerpxBridge = cheerpxBridge;
