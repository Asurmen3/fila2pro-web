import type { Article, FilamentSpool, SpoolPrintHistory, Product, ProductionRecord, FilamentTemplate, AppSettings } from '../types';

const BASE = '/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${url} → ${res.status}`);
  return res.json();
}

// ── Articles ──────────────────────────────────────────────────────────────────
export const articles = {
  list: ()                     => req<Article[]>('/articles'),
  create: (d: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => req<Article>('/articles', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: number, d: Partial<Article>)                      => req<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: number)         => req<{ ok: boolean }>(`/articles/${id}`, { method: 'DELETE' }),
};

// ── Spools ────────────────────────────────────────────────────────────────────
export const spools = {
  list: ()                     => req<FilamentSpool[]>('/spools'),
  create: (d: Omit<FilamentSpool, 'id' | 'dateAdded'>) => req<FilamentSpool>('/spools', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: number, d: Partial<FilamentSpool>)       => req<FilamentSpool>(`/spools/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: number)         => req<{ ok: boolean }>(`/spools/${id}`, { method: 'DELETE' }),
  getHistory: (id: number)     => req<SpoolPrintHistory[]>(`/spools/${id}/history`),
  getAllHistory: ()            => req<SpoolPrintHistory[]>('/spool-history'),
  addHistory: (id: number, d: Omit<SpoolPrintHistory, 'id' | 'spoolId'>) => req<SpoolPrintHistory>(`/spools/${id}/history`, { method: 'POST', body: JSON.stringify(d) }),
  deleteHistory: (id: number)  => req<{ ok: boolean }>(`/spools/history/${id}`, { method: 'DELETE' }),
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const templates = {
  list: () => req<FilamentTemplate[]>('/templates'),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const products = {
  list:   ()                   => req<Product[]>('/products'),
  create: (d: Omit<Product, 'id' | 'createdAt'>) => req<Product>('/products', { method: 'POST', body: JSON.stringify(d) }),
  delete: (id: number)         => req<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
};

// ── Production history ────────────────────────────────────────────────────────
export const history = {
  list:   ()                   => req<ProductionRecord[]>('/history'),
  create: (d: Omit<ProductionRecord, 'id'>) => req<ProductionRecord>('/history', { method: 'POST', body: JSON.stringify(d) }),
  delete: (id: number)         => req<{ ok: boolean }>(`/history/${id}`, { method: 'DELETE' }),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settings = {
  get:  ()               => req<AppSettings>('/settings'),
  save: (d: AppSettings) => req<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(d) }),
};

// ── Backup / Restore ──────────────────────────────────────────────────────────
export const backup = {
  export: () => req<object>('/backup'),
  restore: (data: object) => req<{ ok: boolean }>('/restore', { method: 'POST', body: JSON.stringify(data) }),
};
