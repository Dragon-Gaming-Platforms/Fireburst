// puter-backend.js - Puter.js integration for auth, storage, and database operations
// Replaces Google Apps Script backend for cloud storage, authentication, and data management
// Puter.js provides user accounts, file storage, and database functionality without backend secrets

class PuterBackend {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authToken = null;
        this.puterUrl = 'https://puter.com';
        this.apiUrl = 'https://api.puter.com/v1';
        this.fallbackBackend = null; // Fall back to GAS if Puter fails
        this.mode = 'unknown';
    }

    /**
     * Initialize Puter backend
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            console.log('Initializing Puter backend...');
            this._initFallbackFromConfig();

            // Check if Puter is available in the environment
            if (typeof window.puter !== 'undefined' && window.puter.auth) {
                this.mode = 'puter';
                this.isInitialized = true;
                this.currentUser = await this.getCurrentUser();
                console.log('✓ Puter backend initialized');
                return true;
            } else {
                // Puter SDK not available, will need to load or use fallback
                console.warn('Puter SDK not available, attempting to load...');
                await this.loadPuterSDK();
                this.mode = 'puter';
                this.isInitialized = true;
                this.currentUser = await this.getCurrentUser();
                return true;
            }
        } catch (error) {
            console.warn('Puter initialization failed:', error.message);
            this._initFallbackFromConfig();
            if (this.fallbackBackend) console.log('Falling back to Google Apps Script backend');
            this.isInitialized = true; // Still initialized, just using fallback
            this.mode = 'fallback';
            return true;
        }
    }

    /**
     * Load Puter SDK dynamically
     * @private
     */
    async loadPuterSDK() {
        const sources = [
            'https://js.puter.com/v2/',
            'https://js.puter.com/v2/puter.js',
            'https://js.puter.com/'
        ];
        for (const src of sources) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = resolve;
                script.onerror = resolve;
                document.head.appendChild(script);
            });
            if (typeof window.puter !== 'undefined' && window.puter.auth) return true;
        }
        throw new Error('Failed to load Puter SDK');
    }

    /**
     * Check if user is authenticated with Puter
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        try {
            if (typeof window.puter !== 'undefined' && window.puter.auth) {
                const user = await window.puter.auth.getUser();
                return !!user;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current user information
     * @returns {Promise<Object>} User object
     */
    async getCurrentUser() {
        try {
            if (typeof window.puter !== 'undefined' && window.puter.auth) {
                return await window.puter.auth.getUser();
            }
            return null;
        } catch (error) {
            // Expected when user is not signed in yet (often 401 from Puter API).
            if (error?.status !== 401) console.warn('Failed to get current user:', error);
            return null;
        }
    }

    _getPuterAuthMethod(candidates) {
        if (!window.puter?.auth) return null;
        for (const name of candidates) {
            if (typeof window.puter.auth[name] === 'function') return window.puter.auth[name].bind(window.puter.auth);
        }
        return null;
    }

    /**
     * Authenticate user with Puter
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Auth result
     */
    async authenticate(email, password) {
        try {
            if (typeof window.puter !== 'undefined' && window.puter.auth) {
                const authFn = this._getPuterAuthMethod(['login', 'signIn', 'signin', 'authenticate']);
                if (!authFn) {
                    throw new Error('Puter auth API has no supported sign-in method');
                }
                const result = await authFn(email, password);
                const resolvedUser = result?.user || result?.data?.user || (await this.getCurrentUser()) || { email };
                const resolvedToken = result?.token || result?.data?.token || null;
                this.currentUser = resolvedUser;
                this.authToken = resolvedToken;
                return {
                    success: true,
                    user: resolvedUser,
                    token: resolvedToken
                };
            } else if (this.fallbackBackend) {
                const response = await this._useFallback('login', { email, password });
                if (!response || response.error || (response.success === false && response.ok !== true)) {
                    throw new Error(response?.error || 'Fallback login failed');
                }
                this.currentUser = response.user || { email };
                return { success: true, user: this.currentUser, token: response.token || null };
            } else {
                throw new Error('Puter SDK not available and no fallback backend configured');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a new user account
     * @param {string} email - Email address
     * @param {string} password - Password
     * @param {string} username - Display name
     * @returns {Promise<Object>} Signup result
     */
    async signUp(email, password, username) {
        try {
            if (typeof window.puter !== 'undefined' && window.puter.auth) {
                const signupFn = this._getPuterAuthMethod(['signup', 'signUp', 'register', 'createUser']);
                if (!signupFn) {
                    throw new Error('Puter auth API has no supported sign-up method');
                }
                const result = await signupFn(email, password, { username: username });
                const resolvedUser = result?.user || result?.data?.user || (await this.getCurrentUser()) || { email, username };
                const resolvedToken = result?.token || result?.data?.token || null;
                this.currentUser = resolvedUser;
                this.authToken = resolvedToken;
                return {
                    success: true,
                    user: resolvedUser,
                    token: resolvedToken
                };
            } else if (this.fallbackBackend) {
                // GAS deployments commonly expose `register` rather than `signup`.
                const response = await this._useFallback('register', { email, password, username });
                if (!response || response.error || (response.success === false && response.ok !== true)) {
                    throw new Error(response?.error || 'Fallback signup failed');
                }
                this.currentUser = response.user || { email, username };
                return { success: true, user: this.currentUser, token: response.token || null };
            } else {
                throw new Error('Puter SDK not available and no fallback backend configured');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== FILE STORAGE OPERATIONS ==========

    /**
     * Upload a file to Puter storage
     * @param {File} file - File object
     * @param {string} path - Remote path (default: '/Fireburst/')
     * @returns {Promise<Object>} Upload result
     */
    async uploadFile(file, path = '/Fireburst/') {
        try {
            if (typeof puter !== 'undefined' && puter.fs) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await puter.fs.upload(file, {
                    path: path + file.name
                });

                return {
                    success: true,
                    filename: file.name,
                    path: path + file.name,
                    size: file.size,
                    uploadedAt: new Date()
                };
            } else {
                throw new Error('Puter FS not available');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Download a file from Puter storage
     * @param {string} filepath - Path to file
     * @returns {Promise<Blob>} File blob
     */
    async downloadFile(filepath) {
        try {
            if (typeof puter !== 'undefined' && puter.fs) {
                return await puter.fs.read(filepath);
            } else {
                throw new Error('Puter FS not available');
            }
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }

    /**
     * List files in a directory
     * @param {string} path - Directory path
     * @returns {Promise<Array>} File list
     */
    async listFiles(path = '/Fireburst/') {
        try {
            if (typeof puter !== 'undefined' && puter.fs) {
                const entries = await puter.fs.readdir(path);
                return entries.map(entry => ({
                    name: entry.name,
                    path: entry.path,
                    isDir: entry.is_dir,
                    size: entry.size,
                    modified: entry.modified
                }));
            } else {
                throw new Error('Puter FS not available');
            }
        } catch (error) {
            console.warn('Failed to list files:', error);
            return [];
        }
    }

    /**
     * Delete a file from Puter storage
     * @param {string} filepath - Path to file
     * @returns {Promise<Object>} Delete result
     */
    async deleteFile(filepath) {
        try {
            if (typeof puter !== 'undefined' && puter.fs) {
                await puter.fs.unlink(filepath);
                return {
                    success: true,
                    deletedFile: filepath
                };
            } else {
                throw new Error('Puter FS not available');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== DATABASE OPERATIONS (for messages, chat history, etc.) ==========

    /**
     * Save data to Puter database
     * @param {string} collection - Collection name
     * @param {Object} data - Data to save
     * @returns {Promise<Object>} Save result
     */
    async saveData(collection, data) {
        try {
            if (typeof puter !== 'undefined' && puter.db) {
                const result = await puter.db.set(collection, data);
                return {
                    success: true,
                    id: result.id,
                    data: result
                };
            } else {
                throw new Error('Puter DB not available');
            }
        } catch (error) {
            console.warn('Failed to save data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retrieve data from Puter database
     * @param {string} collection - Collection name
     * @param {string} query - Query criteria
     * @returns {Promise<Array>} Retrieved data
     */
    async getData(collection, query = {}) {
        try {
            if (typeof puter !== 'undefined' && puter.db) {
                const results = await puter.db.get(collection, query);
                return Array.isArray(results) ? results : [results];
            } else {
                throw new Error('Puter DB not available');
            }
        } catch (error) {
            console.warn('Failed to get data:', error);
            return [];
        }
    }

    /**
     * Update data in Puter database
     * @param {string} collection - Collection name
     * @param {string} id - Document ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Update result
     */
    async updateData(collection, id, updates) {
        try {
            if (typeof puter !== 'undefined' && puter.db) {
                const result = await puter.db.update(collection, id, updates);
                return {
                    success: true,
                    id: id,
                    updated: result
                };
            } else {
                throw new Error('Puter DB not available');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete data from Puter database
     * @param {string} collection - Collection name
     * @param {string} id - Document ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteData(collection, id) {
        try {
            if (typeof puter !== 'undefined' && puter.db) {
                await puter.db.delete(collection, id);
                return {
                    success: true,
                    deletedId: id
                };
            } else {
                throw new Error('Puter DB not available');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== MESSAGE/CHAT OPERATIONS ==========

    /**
     * Create a new chat room
     * @param {string} roomName - Room name
     * @param {boolean} isPrivate - Whether room is private
     * @returns {Promise<Object>} Room creation result
     */
    async createRoom(roomName, isPrivate = false) {
        return this.saveData('chat_rooms', {
            name: roomName,
            isPrivate: isPrivate,
            createdAt: new Date(),
            members: [this.currentUser?.email],
            owner: this.currentUser?.email
        });
    }

    /**
     * Get all messages in a room
     * @param {string} room - Room name
     * @returns {Promise<Array>} Messages
     */
    async getRoomMessages(room) {
        return this.getData('chat_messages', { room: room });
    }

    /**
     * Add a message to a room
     * @param {string} room - Room name
     * @param {string} message - Message text
     * @returns {Promise<Object>} Add result
     */
    async addMessage(room, message) {
        return this.saveData('chat_messages', {
            room: room,
            sender: this.currentUser?.email,
            text: message,
            timestamp: new Date(),
            reactions: []
        });
    }

    /**
     * Get room members
     * @param {string} room - Room name
     * @returns {Promise<Array>} Members list
     */
    async getRoomMembers(room) {
        try {
            const roomData = await this.getData('chat_rooms', { name: room });
            return roomData[0]?.members || [];
        } catch (error) {
            console.warn('Failed to get room members:', error);
            return [];
        }
    }

    /**
     * Add user to private room
     * @param {string} room - Room name
     * @param {string} userEmail - Email of user to add
     * @returns {Promise<Object>} Add result
     */
    async addUserToRoom(room, userEmail) {
        try {
            const roomData = await this.getData('chat_rooms', { name: room });
            if (roomData[0]) {
                const members = roomData[0].members || [];
                if (!members.includes(userEmail)) {
                    members.push(userEmail);
                }
                return this.updateData('chat_rooms', roomData[0].id, { members });
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if room is private
     * @param {string} room - Room name
     * @returns {Promise<boolean>}
     */
    async isRoomPrivate(room) {
        try {
            const roomData = await this.getData('chat_rooms', { name: room });
            return roomData[0]?.isPrivate || false;
        } catch (error) {
            return false;
        }
    }

    // ========== FALLBACK METHODS ==========

    /**
     * Set fallback Google Apps Script backend
     * @param {string} backendUrl - GAS backend URL
     */
    setFallbackBackend(backendUrl) {
        this.fallbackBackend = backendUrl;
    }

    _initFallbackFromConfig() {
        const runtimeBackend = window.RUNTIME_CONFIG?.BACKEND_URL || '';
        const savedBackend = localStorage.getItem('chat_backend_url') || '';
        const backend = savedBackend || runtimeBackend;
        if (backend) this.setFallbackBackend(backend);
    }

    /**
     * Use fallback GAS backend
     * @private
     */
    async _useFallback(action, data) {
        if (!this.fallbackBackend) {
            throw new Error('No fallback backend configured');
        }

        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_cb_' + Math.round(1000000 * Math.random());
            window[callbackName] = function(response) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(response);
            };

            const script = document.createElement('script');
            let queryString = `?callback=${callbackName}&action=${action}`;
            for (let key in data) {
                queryString += `&${key}=${encodeURIComponent(data[key])}`;
            }
            script.src = this.fallbackBackend + queryString;
            script.onerror = () => {
                reject(new Error('Fallback request failed'));
                delete window[callbackName];
                document.body.removeChild(script);
            };
            document.body.appendChild(script);
        });
    }
}

// Create global instance
const puterBackend = new PuterBackend();

// Expose globally for app integration
window.PuterBackend = PuterBackend;
window.puterBackend = puterBackend;

// Initialize on document ready
document.addEventListener('DOMContentLoaded', async () => {
    puterBackend._initFallbackFromConfig();
    await puterBackend.initialize();
});
