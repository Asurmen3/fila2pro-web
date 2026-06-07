import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, Cpu, History, ChevronRight, Layers, X, Settings, BarChart3, ShoppingCart } from 'lucide-react';
import type { Page } from '../../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Tableau de bord',  icon: LayoutDashboard },
  { id: 'filaments' as Page, label: 'Bobines filament',  icon: Layers },
  { id: 'stock'     as Page, label: 'Stock composants',  icon: Package },
  { id: 'products'  as Page, label: 'Produits & coûts',  icon: Cpu },
  { id: 'stats'     as Page, label: 'Statistiques',      icon: BarChart3 },
  { id: 'shopping'  as Page, label: 'Liste de courses',  icon: ShoppingCart },
  { id: 'history'   as Page, label: 'Historique',        icon: History },
  { id: 'settings'  as Page, label: 'Paramètres',        icon: Settings },
];

const SidebarContent = ({ currentPage, onNavigate, onClose }: Omit<SidebarProps, 'open'>) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="px-6 py-7 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)', boxShadow: '0 0 20px rgba(0,217,255,0.4)' }}>
        <span className="text-[#070B1A] font-black text-sm">F2P</span>
      </div>
      <div className="flex-1">
        <div className="font-black text-lg leading-none tracking-tight"
          style={{ fontFamily: 'Space Grotesk', color: '#00D9FF', textShadow: '0 0 15px rgba(0,217,255,0.4)' }}>
          FILA<span style={{ color: '#8B5CF6' }}>2PRO</span>
        </div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">Atelier de fabrication</div>
      </div>
      {/* Close button — mobile only */}
      <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white transition-colors p-1">
        <X size={18} />
      </button>
    </div>

    <div className="mx-4 mb-4" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,217,255,0.3), transparent)' }} />

    <nav className="flex-1 px-3 space-y-1">
      {navItems.map(item => {
        const active = currentPage === item.id;
        const Icon = item.icon;
        return (
          <motion.button key={item.id}
            onClick={() => { onNavigate(item.id); onClose(); }}
            whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={active ? {
              background: 'linear-gradient(135deg, rgba(0,217,255,0.15) 0%, rgba(139,92,246,0.1) 100%)',
              border: '1px solid rgba(0,217,255,0.25)', color: '#00D9FF',
              boxShadow: '0 0 15px rgba(0,217,255,0.1)',
            } : {
              background: 'transparent', border: '1px solid transparent', color: 'rgba(148,163,184,0.7)',
            }}>
            <Icon size={18} style={active ? { color: '#00D9FF', filter: 'drop-shadow(0 0 6px rgba(0,217,255,0.6))' } : {}} />
            <span>{item.label}</span>
            {active && <ChevronRight size={14} className="ml-auto" style={{ color: '#00D9FF', opacity: 0.7 }} />}
          </motion.button>
        );
      })}
    </nav>

    <div className="px-6 py-5">
      <div className="text-xs text-slate-600 font-medium">v2.6.2 — 2025</div>
      <div className="text-xs text-slate-700 mt-0.5">Données centralisées NAS</div>
    </div>
  </div>
);

export default function Sidebar({ currentPage, onNavigate, open, onClose }: SidebarProps) {
  const sidebarStyle = {
    background: 'linear-gradient(180deg, #08102A 0%, #070B1A 100%)',
    borderRight: '1px solid rgba(0,217,255,0.1)',
  };

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-30" style={sidebarStyle}>
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} onClose={onClose} />
      </aside>

      {/* Mobile: drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(7,11,26,0.7)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} />
            {/* Drawer */}
            <motion.aside className="fixed left-0 top-0 h-screen w-72 flex flex-col z-50 md:hidden"
              style={sidebarStyle}
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <SidebarContent currentPage={currentPage} onNavigate={onNavigate} onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
