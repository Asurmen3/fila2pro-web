import { motion } from 'framer-motion';
import { LayoutDashboard, Layers, Package, Cpu, Settings } from 'lucide-react';
import type { Page } from '../../types';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

// Sur mobile on garde 5 items max — on remplace Historique par Paramètres
const navItems = [
  { id: 'dashboard' as Page, label: 'Accueil',  icon: LayoutDashboard },
  { id: 'filaments' as Page, label: 'Bobines',  icon: Layers },
  { id: 'stock'     as Page, label: 'Stock',    icon: Package },
  { id: 'products'  as Page, label: 'Produits', icon: Cpu },
  { id: 'settings'  as Page, label: 'Réglages', icon: Settings },
];

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{ background: 'rgba(8,16,42,0.97)', borderTop: '1px solid rgba(0,217,255,0.15)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-stretch h-16">
        {navItems.map(item => {
          const active = currentPage === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              {active && (
                <motion.div layoutId="bottom-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #00D9FF, #8B5CF6)' }} />
              )}
              <Icon size={20} style={active ? { color: '#00D9FF', filter: 'drop-shadow(0 0 6px rgba(0,217,255,0.7))' } : { color: '#475569' }} />
              <span className="text-[10px] font-semibold" style={{ color: active ? '#00D9FF' : '#475569' }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      {/* iPhone safe area */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'rgba(8,16,42,0.97)' }} />
    </nav>
  );
}
