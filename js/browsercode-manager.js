// browsercode-manager.js - Manages BrowserCode AI assistant integration

class BrowserCodeManager {
    constructor() {
        this.isInitialized = false;
        this.currentModel = 'gemini'; // Default to Gemini
        this.availableModels = ['claude', 'gemini'];
        this.apiKeys = {};
        this.assistantWindow = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        // Load BrowserCode if needed
        // For now, we'll iframe browsercode.io
        this.isInitialized = true;
    }

    setModel(model) {
        if (this.availableModels.includes(model)) {
            this.currentModel = model;
            localStorage.setItem('browsercode-model', model);
        }
    }

    getModel() {
        return localStorage.getItem('browsercode-model') || this.currentModel;
    }

    setApiKey(model, key) {
        this.apiKeys[model] = key;
        localStorage.setItem(`browsercode-api-${model}`, key);
    }

    getApiKey(model) {
        return localStorage.getItem(`browsercode-api-${model}`) || this.apiKeys[model];
    }

    launchAssistant(container) {
        if (!container) {
            // Create a new window
            this.assistantWindow = window.osWindowManager.createWindow('AI Assistant', 800, 600);
            container = this.assistantWindow.content;
        }

        // Create iframe to BrowserCode
        const iframe = document.createElement('iframe');
        iframe.src = 'https://browsercode.io/';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        container.appendChild(iframe);

        // Add model selection UI
        this.addModelSelector(container);

        return iframe;
    }

    addModelSelector(container) {
        const selector = document.createElement('div');
        selector.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            padding: 5px;
            background: white;
            border: 1px solid #ccc;
        `;

        this.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model.charAt(0).toUpperCase() + model.slice(1);
            if (model === this.getModel()) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.setModel(select.value);
            // Reload the iframe to apply new model
            const iframe = container.querySelector('iframe');
            if (iframe) {
                iframe.src = iframe.src; // Simple reload
            }
        });

        selector.appendChild(select);
        container.appendChild(selector);
    }

    async runCommandInTerminal(command, terminal) {
        // Send command to BrowserCode terminal
        // This would require communication with the iframe
        // For now, simulate
        if (terminal && terminal.cx) {
            await terminal.cx.run('/bin/bash', ['-c', command]);
        }
    }

    integrateWithTerminal(terminal) {
        // Add browsercode command to terminal
        if (terminal && terminal.cx) {
            // This would require hooking into the shell
            // For demonstration, we'll add a global command
            window.browsercode = (args) => {
                if (args.includes('--model')) {
                    const modelIndex = args.indexOf('--model');
                    if (args[modelIndex + 1]) {
                        this.setModel(args[modelIndex + 1]);
                        console.log(`Model set to ${this.getModel()}`);
                    }
                } else {
                    this.launchAssistant();
                }
            };
        }
    }

    async codeWithAI(code, language) {
        // Send code to AI for processing
        // This would integrate with BrowserCode API
        // For now, return a placeholder
        return `// AI-processed ${language} code\n${code}`;
    }

    async debugCode(code, error) {
        // Send code and error to AI for debugging
        return `// Debugged code\n${code}\n// Fixed: ${error}`;
    }
}

// Global instance
window.browserCodeManager = new BrowserCodeManager();