// Main OS emulators run in standard context and must not depend on COI/CheerpX isolation.
class EmulatorManagerClass {
  constructor() {
    this.romExtMap = {
      nes: ['nes'], snes: ['sfc','smc'], gb: ['gb','gbc'], gba: ['gba'], nds: ['nds'],
      psx: ['bin','iso','cue'], genesis: ['smd','md','gen']
    };
  }
  async _launch(type, romFile) {
    if (!romFile) throw new Error('ROM file required (user-provided only).');
    return window.parent?.openWindow
      ? window.parent.openWindow(`${type.toUpperCase()} Emulator`, `apps/preinstalled/${type}-emulator.html?rom=${encodeURIComponent(romFile.name || romFile)}`)
      : window.open(`apps/preinstalled/${type}-emulator.html`, '_blank');
  }
  loadNES(romFile){ return this._launch('nes', romFile); }
  loadSNES(romFile){ return this._launch('snes', romFile); }
  loadGB(romFile){ return this._launch('gameboy', romFile); }
  loadGBA(romFile){ return this._launch('gba', romFile); }
  loadNDS(romFile){ return this._launch('nds', romFile); }
  loadPSX(romFile){ return this._launch('psx', romFile); }
  loadGenesis(romFile){ return this._launch('genesis', romFile); }
  saveState(emulator, slot){ localStorage.setItem(`emu:${emulator}:slot:${slot}`, JSON.stringify({ ts: Date.now() })); }
  loadState(emulator, slot){ return JSON.parse(localStorage.getItem(`emu:${emulator}:slot:${slot}`) || 'null'); }
  async getROMLibrary() { return (await window.parent.VFS.getFiles()).filter(f => /\.(nes|sfc|smc|gb|gbc|gba|nds|bin|iso|cue|smd|md|gen)$/i.test(f.name)); }
}
window.EmulatorManager = new EmulatorManagerClass();
