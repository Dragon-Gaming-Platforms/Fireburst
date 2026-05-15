class DragonCheerpXClass {
  constructor() {
    this.ready = false;
    this.bridge = window.cheerpxBridge || null;
  }

  async init() {
    if (this.ready) return;
    if (!this.bridge && window.cheerpxBridge) this.bridge = window.cheerpxBridge;
    if (!this.bridge) throw new Error('CheerpX bridge unavailable');
    if (!this.bridge.isConnected) {
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

  async runGUI(executable) {
    await this.init();
    const response = await this.bridge.runNativeApp(executable, []);
    return { ok: response.success !== false, stdout: `Launched ${executable}\n`, stderr: response.error || '' };
  }

  async uploadFile(file, path = '/data') {
    await this.init();
    return this.bridge.uploadFile(file, path);
  }

  async downloadFile(path) {
    await this.init();
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
    window.open(`apps/preinstalled/terminal.html?model=${encodeURIComponent(model)}`, '_blank', 'noopener');
    return { ok: true, model };
  }

  async runWine(exePath) {
    await this.init();
    const response = await this.bridge.runWindowsApp(exePath, []);
    return response.result || { ok: response.success !== false, stdout: '', stderr: response.error || '' };
  }
}

window.DragonCheerpX = new DragonCheerpXClass();
