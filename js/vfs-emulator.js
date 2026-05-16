// VFS-Integrated Emulator Detection System
// Automatically detects ROM files and routes them to appropriate emulators
class VFSEmulatorIntegration {
  constructor() {
    this.romExtMap = {
      nes: ['nes'],
      snes: ['sfc', 'smc'],
      gameboy: ['gb', 'gbc'],
      gba: ['gba'],
      nds: ['nds'],
      psx: ['bin', 'iso', 'cue'],
      genesis: ['smd', 'md', 'gen']
    };
  }

  // Detect emulator type from file extension
  detectEmulatorType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    for (const [emulator, extensions] of Object.entries(this.romExtMap)) {
      if (extensions.includes(ext)) {
        return emulator;
      }
    }
    return null;
  }

  // Launch emulator with ROM file
  async launchEmulator(file) {
    const emulatorType = this.detectEmulatorType(file.name);
    
    if (!emulatorType) {
      throw new Error(`Unsupported ROM format: ${file.name.split('.').pop()}`);
    }

    const emulatorPath = `system/${emulatorType}-emulator.html`;
    const romData = typeof file.content === 'string' ? file.content : file;
    
    // Pass ROM data to emulator via URL parameter or session storage
    try {
      sessionStorage.setItem('rom_data', JSON.stringify({
        name: file.name,
        content: romData,
        type: emulatorType
      }));
    } catch (e) {
      console.warn('SessionStorage unavailable, using URL parameter');
    }

    // Open emulator window with ROM file reference
    if (window.parent && window.parent.openWindow) {
      window.parent.openWindow(
        `${emulatorType.toUpperCase()} Emulator - ${file.name}`,
        emulatorPath + `?rom=${encodeURIComponent(file.name)}`
      );
    } else {
      window.open(emulatorPath, '_blank');
    }
  }

  // Get all ROMs organized by platform
  async getROMLibrary() {
    try {
      const files = await window.parent.VFS.getFiles();
      const romLibrary = {};

      // Initialize all platforms
      for (const platform of Object.keys(this.romExtMap)) {
        romLibrary[platform] = [];
      }

      // Sort files by platform
      files.forEach(file => {
        const platform = this.detectEmulatorType(file.name);
        if (platform && romLibrary[platform]) {
          romLibrary[platform].push({
            name: file.name,
            size: file.size || 0,
            modified: file.modified || new Date().toISOString()
          });
        }
      });

      return romLibrary;
    } catch (error) {
      console.error('Failed to get ROM library:', error);
      return {};
    }
  }

  // Check if file is a supported ROM
  isSupportedROM(filename) {
    return this.detectEmulatorType(filename) !== null;
  }

  // Get supported extensions
  getSupportedExtensions() {
    const extensions = [];
    for (const exts of Object.values(this.romExtMap)) {
      extensions.push(...exts);
    }
    return extensions;
  }
}

window.VFSEmulatorIntegration = new VFSEmulatorIntegration();
