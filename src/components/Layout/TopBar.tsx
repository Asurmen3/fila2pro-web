import { Bell, Settings, Zap, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard:  { title: 'Tableau de bord',  subtitle: 'Vue globale de votre atelier' },
  filaments:  { title: 'Bobines filament', subtitle: 'Gestion des spools & impressions' },
  stock:      { title: 'Stock composants', subtitle: 'Électronique, visserie, emballage…' },
  products:   { title: 'Produits & coûts', subtitle: 'Calcul de coûts & prix de vente' },
  history:    { title: 'Historique',       subtitle: 'Productions & fabrications passées' },
  settings:   { title: 'Paramètres',       subtitle: 'Électricité, backup & restauration' },
};

interface TopBarProps { currentPage: string; onMenuClick: () => void; }

export default function TopBar({ currentPage, onMenuClick }: TopBarProps) {
  const info = pageTitles[currentPage] ?? pageTitles.dashboard;
  const { articles, spools } = useApp();

  const alertCount = articles.filter(a => a.alertThreshold && a.stockRemaining <= a.alertThreshold).length
    + spools.filter(s => s.currentWeight < 200).length;

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(0,217,255,0.08)', background: 'rgba(7,11,26,0.9)', backdropFilter: 'blur(10px)', zIndex: 20 }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors" style={{ border: '1px solid rgba(0,217,255,0.15)' }}>
          <Menu size={18} className="text-slate-400" />
        </button>
        <div>
          <h1 className="text-base md:text-xl font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk', letterSpacing: '-0.01em' }}>{info.title}</h1>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">{info.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
          <span className="text-xs font-medium" style={{ color: '#00FF88' }}>Actif</span>
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors" style={{ border: '1px solid rgba(0,217,255,0.15)' }}>
          <Bell size={15} className="text-slate-400" />
          {alertCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#FF8C00', color: '#070B1A' }}>{alertCount}</span>}
        </button>
        <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-white/5 transition-colors" style={{ border: '1px solid rgba(0,217,255,0.15)' }}>
          <Settings size={15} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2 pl-2 md:pl-3" style={{ borderLeft: '1px solid rgba(0,217,255,0.1)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)' }}>
            <Zap size={14} style={{ color: '#070B1A' }} />
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-semibold text-white">Mon atelier</div>
            <div className="text-[10px] text-slate-500">Artisan maker</div>
          </div>
        </div>
      </div>
    </header>
  );
}
