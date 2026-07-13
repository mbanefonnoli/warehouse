import type { Customer } from '@spoke/shared';
import type { ImportConfig, Settings } from '@/types';

const MASTER_KEY = 'srb_master_list';
const CONFIG_KEY = 'srb_import_config';
const SETTINGS_KEY = 'srb_settings';

const DEFAULT_SETTINGS: Settings = {
  matchSensitivity: 'normal',
  stripCompanySuffixes: true,
  includeAllColumns: false,
};

export function saveMasterList(customers: Customer[], config: ImportConfig): void {
  try {
    localStorage.setItem(MASTER_KEY, JSON.stringify(customers));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be full; silently ignore
  }
}

export function loadMasterList(): { customers: Customer[]; config: ImportConfig } | null {
  try {
    const raw = localStorage.getItem(MASTER_KEY);
    const configRaw = localStorage.getItem(CONFIG_KEY);
    if (!raw || !configRaw) return null;
    return { customers: JSON.parse(raw), config: JSON.parse(configRaw) };
  } catch {
    return null;
  }
}

export function clearMasterList(): void {
  localStorage.removeItem(MASTER_KEY);
  localStorage.removeItem(CONFIG_KEY);
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
