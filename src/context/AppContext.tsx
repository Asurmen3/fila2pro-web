import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as api from '../api';
import type { Article, FilamentSpool, SpoolPrintHistory, Product, ProductionRecord, FilamentTemplate, AppSettings } from '../types';

interface AppContextValue {
  articles: Article[];
  spools: FilamentSpool[];
  spoolHistory: SpoolPrintHistory[];
  products: Product[];
  productionHistory: ProductionRecord[];
  templates: FilamentTemplate[];
  settings: AppSettings;
  loading: boolean;
  refresh: () => void;
  refreshSpoolHistory: (spoolId: number) => Promise<SpoolPrintHistory[]>;
  saveSettings: (s: AppSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = { kWhPrice: 0.18, printerWatts: 150, workshopName: 'Mon atelier' };

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export function AppProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles]               = useState<Article[]>([]);
  const [spools, setSpools]                   = useState<FilamentSpool[]>([]);
  const [spoolHistory, setSpoolHistory]       = useState<SpoolPrintHistory[]>([]);
  const [products, setProducts]               = useState<Product[]>([]);
  const [productionHistory, setProdHistory]   = useState<ProductionRecord[]>([]);
  const [templates, setTemplates]             = useState<FilamentTemplate[]>([]);
  const [settings, setSettings]               = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]                 = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [a, sp, pr, ph, tm, st, sh] = await Promise.all([
        api.articles.list(),
        api.spools.list(),
        api.products.list(),
        api.history.list(),
        api.templates.list(),
        api.settings.get(),
        api.spools.getAllHistory(),
      ]);
      setArticles(a);
      setSpools(sp);
      setProducts(pr);
      setProdHistory(ph);
      setTemplates(tm);
      setSettings(st);
      setSpoolHistory(sh);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Historique d'une bobine précise (vue détaillée) — ne touche pas l'état global
  async function refreshSpoolHistory(spoolId: number) {
    return api.spools.getHistory(spoolId);
  }

  async function saveSettings(s: AppSettings) {
    await api.settings.save(s);
    setSettings(s);
  }

  useEffect(() => {
    refresh();
    // Polling : recharge les données toutes les 10s pour synchroniser entre appareils
    const interval = setInterval(refresh, 10000);
    // Recharge aussi quand l'onglet redevient actif
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  return (
    <AppContext.Provider value={{ articles, spools, spoolHistory, products, productionHistory, templates, settings, loading, refresh, refreshSpoolHistory, saveSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
