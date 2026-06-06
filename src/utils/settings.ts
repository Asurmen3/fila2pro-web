import type { AppSettings } from '../types';

const KEY = 'fila2pro_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  kWhPrice: 0.18,
  printerWatts: 150,
  workshopName: 'Mon atelier',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function calcElectricityCost(printMinutes: number, settings: AppSettings): number {
  return (printMinutes / 60) * (settings.printerWatts / 1000) * settings.kWhPrice;
}
