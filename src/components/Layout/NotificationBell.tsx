import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Package, Layers, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Page } from '../../types';

interface Notif {
  id: string;
  type: 'spool' | 'article';
  severity: 'critique' | 'faible';
  title: string;
  detail: string;
}

export default function NotificationBell({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { articles, spools } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Construire les notifications dynamiquement
  const notifs: Notif[] = [];

  spools.forEach(s => {
    if (s.currentWeight <= 0) {
      notifs.push({ id: `spool-${s.id}`, type: 'spool', severity: 'critique', title: `${s.brand} ${s.material} ${s.color}`, detail: 'Bobine épuisée' });
    } else if (s.currentWeight < 100) {
      notifs.push({ id: `spool-${s.id}`, type: 'spool', severity: 'critique', title: `${s.brand} ${s.material} ${s.color}`, detail: `${Math.round(s.currentWeight)} g restants` });
    } else if (s.currentWeight < 200) {
      notifs.push({ id: `spool-${s.id}`, type: 'spool', severity: 'faible', title: `${s.brand} ${s.material} ${s.color}`, detail: `${Math.round(s.currentWeight)} g restants` });
    }
  });

  articles.forEach(a => {
    if (a.alertThreshold && a.stockRemaining <= a.alertThreshold) {
      const critique = a.stockRemaining <= 0 || a.stockRemaining <= a.alertThreshold / 2;
      notifs.push({
        id: `article-${a.id}`,
        type: 'article',
        severity: critique ? 'critique' : 'faible',
        title: a.name,
        detail: a.stockRemaining <= 0 ? 'Rupture de stock' : `${a.stockRemaining} ${a.unit} restants (seuil ${a.alertThreshold})`,
      });
    }
  });

  // Tri : critiques d'abord
  notifs.sort((a, b) => (a.severity === 'critique' ? -1 : 1) - (b.severity === 'critique' ? -1 : 1));

  const count = notifs.length;
  const criticalCount = notifs.filter(n => n.severity === 'critique').length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
        style={{ border: '1px solid rgba(0,217,255,0.15)' }}>
        <Bell size={15} className="text-slate-400" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: criticalCount > 0 ? '#FF2D55' : '#FF8C00', color: '#fff', boxShadow: `0 0 8px ${criticalCount > 0 ? 'rgba(255,45,85,0.6)' : 'rgba(255,140,0,0.6)'}` }}>
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-w-[90vw] glass-card neon-border-cyan overflow-hidden z-50"
            style={{ maxHeight: '70vh' }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,217,255,0.1)' }}>
              <div className="flex items-center gap-2">
                <Bell size={15} style={{ color: '#00D9FF' }} />
                <span className="text-sm font-bold text-white">Notifications</span>
              </div>
              {count > 0 && (
                <span className="badge" style={{ background: 'rgba(255,140,0,0.15)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.3)' }}>
                  {count} alerte{count > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Liste */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 50px)' }}>
              {count === 0 ? (
                <div className="px-4 py-10 flex flex-col items-center text-center">
                  <CheckCircle2 size={36} style={{ color: '#00FF88', opacity: 0.5 }} className="mb-3" />
                  <div className="text-sm font-semibold text-slate-300">Tout est en ordre</div>
                  <div className="text-xs text-slate-500 mt-1">Aucun stock faible détecté</div>
                </div>
              ) : (
                notifs.map(n => {
                  const isCrit = n.severity === 'critique';
                  const color = isCrit ? '#FF2D55' : '#FF8C00';
                  const Icon = n.type === 'spool' ? Layers : Package;
                  return (
                    <button key={n.id}
                      onClick={() => { onNavigate(n.type === 'spool' ? 'filaments' : 'stock'); setOpen(false); }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                      style={{ borderBottom: '1px solid rgba(0,217,255,0.05)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isCrit && <AlertTriangle size={11} style={{ color }} />}
                          <span className="text-sm font-semibold text-white truncate">{n.title}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color }}>{n.detail}</div>
                      </div>
                      <span className="badge flex-shrink-0 mt-1" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {n.severity}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
