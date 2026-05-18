/**
 * Fireburst CheerpX integration architecture
 * -----------------------------------------
 * - Main OS (desktop, games, browser tools, emulator manager) runs in the normal app context.
 *   It does NOT require COI and must remain unaffected by CheerpX constraints.
 * - CheerpX command execution is delegated through window.cheerpxBridge to a separate
 *   COI-enabled runner context.
 * - Native GUI apps (ELF binaries, Wine apps, etc.) are launched by that runner and should
 *   open in dedicated tabs/windows configured for COI.
 * - File sync uses the bridge boundary to copy data between the main VFS and CheerpX runtime.
 */
class DragonCheerpXClass {
  constructor() {
    this.ready = false;
    this.bridge = window.cheerpxBridge || null;
    this.pending = new Map();
    this.requestId = 0;
    window.addEventListener('message', (event) => this.handleRunnerMessage(event));
  }

  async init() {
    if (this.ready) return;
    if (!this.bridge && window.cheerpxBridge) this.bridge = window.cheerpxBridge;
    if (!this.bridge) this.bridge = this.createSystemBridge();
    if (!this.bridge.isConnected) {
      // Opens/attaches to separate COI-enabled execution environment.
      const connected = await this.bridge.open({ width: 1100, height: 760 });
      if (!connected) throw new Error('Unable to connect to CheerpX runner (COI context).');
    }
    this.ready = true;
  }

  async execute(command) {
    await this.init();
    if (/\.elf(\s|$)/i.test(command)) {
      const file = command.trim().split(/\s+/)[0];
      return this.runGUI(file);
    }
    const response = await this.bridge.executeCommand(command);
    return response.result || { ok: response.success !== false, stdout: '', stderr: response.error || '' };
  }

  async runGUI(executable, file = null) {
    await this.init();
    // GUI workloads are expected to launch in a new COI-enabled window/tab.
    const response = await this.bridge.runNativeApp(executable, [], file);
    return { ok: response.success !== false, stdout: `Launched ${executable}\n`, stderr: response.error || '' };
  }

  async uploadFile(file, path = '/data') {
    await this.init();
    return this.bridge.uploadFile(file, path);
  }

  async downloadFile(path) {
    await this.init();
    if (!this.bridge.downloadFile) throw new Error('CheerpX download is not available in this runner yet.');
    return this.bridge.downloadFile(path);
  }

  async syncFileSystem() {
    await this.init();
    if (!window.VFS) return { ok: false, error: 'VFS unavailable' };
    const files = await window.VFS.getFiles();
    for (const f of files) {
      if (f.type === 'folder' || !f.content) continue;
      const blob = new Blob([f.content], { type: f.type || 'text/plain' });
      const file = new File([blob], f.name.split('/').pop(), { type: f.type || 'application/octet-stream' });
      await this.uploadFile(file, '/data');
    }
    return { ok: true, synced: files.length };
  }

  async startBrowserCode(model = 'gemini') {
    // BrowserCode runs in separate terminal surface and should remain isolated from main OS.
    const basePath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : window.location.pathname.replace(/[^/]*$/, '');
    const target = new URL(`apps/preinstalled/terminal.html?model=${encodeURIComponent(model)}`, `${window.location.origin}${basePath}`);
    window.open(target.toString(), '_blank', 'noopener');
    return { ok: true, model, url: target.toString() };
  }

  async runWine(exePath, file = null) {
    await this.init();
    const response = await this.bridge.runWindowsApp(exePath, [], file);
    return response.result || { ok: response.success !== false, stdout: '', stderr: response.error || '' };
  }

  createSystemBridge() {
    const api = this;
    return {
      isConnected: false,
      runner: null,

      async open(options = {}) {
        if (!this.runner || this.runner.closed) {
          const width = options.width || 1100;
          const height = options.height || 760;
          const basePath = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname.replace(/[^/]*$/, '');
          const url = new URL('system/cheerpx-runner.html', `${window.location.origin}${basePath}`);
          this.runner = window.open(
            url.toString(),
            'fireburst-cheerpx-runner',
            `popup,width=${width},height=${height},noopener=false`
          );
          if (!this.runner) throw new Error('Popup blocked while opening the CheerpX runner.');
        }
        await api.waitForRunner();
        this.isConnected = true;
        return true;
      },

      executeCommand(command) {
        return api.sendRunnerRequest('executeCommand', { command });
      },

      runNativeApp(executable, args = [], file = null) {
        return api.sendRunnerRequest('runNativeApp', { executable, args, file });
      },

      runWindowsApp(executable, args = [], file = null) {
        return api.sendRunnerRequest('runWindowsApp', { executable, args, file });
      },

      uploadFile(file, path) {
        return api.sendRunnerRequest('uploadFile', { file, path });
      }
    };
  }

  handleRunnerMessage(event) {
    const message = event.data;
    if (!message || message.type !== 'fireburst:cheerpx-response') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.success === false) {
      pending.reject(new Error(message.error || 'CheerpX runner request failed.'));
    } else {
      pending.resolve(message);
    }
  }

  sendRunnerRequest(action, payload) {
    const runner = this.bridge && this.bridge.runner;
    if (!runner || runner.closed) {
      return Promise.reject(new Error('CheerpX runner window is not open.'));
    }
    const id = `cx-${++this.requestId}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CheerpX runner did not respond.'));
      }, action === 'ping' ? 8000 : 120000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      runner.postMessage(Object.assign({ type: 'fireburst:cheerpx-request', id, action }, payload), '*');
    });
  }

  async waitForRunner() {
    let lastError = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 300 : 500));
        await this.sendRunnerRequest('ping', {});
        return true;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('CheerpX runner did not start.');
  }
}

window.DragonCheerpX = new DragonCheerpXClass();
