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
  }

  async init() {
    if (this.ready) return;
    if (!this.bridge && window.cheerpxBridge) this.bridge = window.cheerpxBridge;
    if (!this.bridge) throw new Error('CheerpX bridge unavailable');
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

  async runGUI(executable) {
    await this.init();
    // GUI workloads are expected to launch in a new COI-enabled window/tab.
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
    // BrowserCode runs in separate terminal surface and should remain isolated from main OS.
    const basePath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : window.location.pathname.replace(/[^/]*$/, '');
    const target = new URL(`apps/preinstalled/terminal.html?model=${encodeURIComponent(model)}`, `${window.location.origin}${basePath}`);
    window.open(target.toString(), '_blank', 'noopener');
    return { ok: true, model, url: target.toString() };
  }

  async runWine(exePath) {
    await this.init();
    const response = await this.bridge.runWindowsApp(exePath, []);
    return response.result || { ok: response.success !== false, stdout: '', stderr: response.error || '' };
  }
}

window.DragonCheerpX = new DragonCheerpXClass();
