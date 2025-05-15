import { logger } from '../utils/logger';

export interface ExtensionSettings {
  port: number;
  maxRequests: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  port: 8080,
  maxRequests: 1000,
  logLevel: 'info'
};

export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(['settings']);
    return {
      ...DEFAULT_SETTINGS,
      ...(result.settings || {})
    };
  } catch (error) {
    logger.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<boolean> {
  try {
    const currentSettings = await loadSettings();
    const newSettings = { ...currentSettings, ...settings };
    await chrome.storage.local.set({ settings: newSettings });
    return true;
  } catch (error) {
    logger.error('Failed to save settings:', error);
    return false;
  }
}

export async function getPort(): Promise<number> {
  const settings = await loadSettings();
  return settings.port;
}

export async function setPort(port: number): Promise<boolean> {
  return saveSettings({ port });
}

// Export for testing
export const __test__ = {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings
};
