import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { History as HistoryIcon, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

function fmt(n: number, d = 2) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function History() {
  const history = useLiveQuery(() => db.productionHistory.orderBy('date').reverse().toArray(), []) ?? [];
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = history.filter(h => h.productName.toLowerCase().includes(search.toLowerCase()));

  const totalRevenue = history.reduce((s, h) => s + h.suggestedPrice, 0);
  const totalCosts = history.reduce((s, h) => s + h.totalCost, 0);
  const totalProfit = history.reduce((s, h) => s + h.grossProfit, 0);
  const avgMargin = history.length > 0 ? history.reduce((s, h) => s + h.marginPercent, 0) / history.length : 0;

  async function handleDelete(id: number) {
    if (confirm('Supprimer cet enregistrement ?')) await db.productionHistory.delete(id);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CA potentiel', value: fmt(totalRevenue) + ' €', color: '#00D9FF' },
          { label: 'Coûts totaux', value: fmt(totalCosts) + ' €', color: '#8B5CF6' },
          { label: 'Bénéfice total', value: fmt(totalProfit) + ' €', color: '#00FF88' },
          { label: 'Marge moyenne', value: fmt(avgMargin) + ' %', color: '#FF8C00' },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-3">
            <div className="text-xl font-bold" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-9" placeholder="Rechercher dans l'historique…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center text-center">
          <HistoryIcon size={48} className="mb-4 opacity-20" />
          <div className="text-slate-500 text-sm">{search ? 'Aucun résultat' : 'Aucune production dans l\'historique'}</div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((h, i) => {
              const expanded = expandedId === h.id;
              return (
                <motion.div key={h.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className="glass-card overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : h.id!)}>
                      {/* Date badge */}
                      <div className="text-center flex-shrink-0 w-12">
                        <div className="text-[10px] text-slate-600 uppercase">
                          {new Date(h.date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                        <div className="text-lg font-bold text-slate-300 leading-none" style={{ fontFamily: 'Space Grotesk' }}>
                          {new Date(h.date).getDate()}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{h.productName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{h.components.length} composant(s)</div>
                      </div>

                      <div className="hidden sm:flex items-center gap-5">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Coût</div>
                          <div className="text-sm font-semibold text-white">{fmt(h.totalCost)} €</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Prix conseillé</div>
                          <div className="text-sm font-bold" style={{ color: '#00D9FF' }}>{fmt(h.suggestedPrice)} €</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Bénéfice</div>
                          <div className="text-sm font-bold" style={{ color: '#00FF88' }}>+{fmt(h.grossProfit)} €</div>
                        </div>
                        <div className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)' }}>
                          {fmt(h.marginPercent)}%
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="btn-danger py-1 px-2" onClick={e => { e.stopPropagation(); handleDelete(h.id!); }}>
                          <Trash2 size={13} />
                        </button>
                        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(0,217,255,0.08)', overflow: 'hidden' }}>
                          <div className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Composants utilisés</div>
                                <div className="space-y-1.5">
                                  {h.components.map((c, j) => (
                                    <div key={j} className="flex items-center justify-between py-1 px-3 rounded-lg" style={{ background: 'rgba(0,217,255,0.04)' }}>
                                      <span className="text-xs text-white">{c.articleName}</span>
                                      <span className="text-xs text-slate-400">{c.quantity} {c.unit}</span>
                                      <span className="text-xs font-semibold" style={{ color: '#00D9FF' }}>{fmt(c.totalCost)} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Détail financier</div>
                                <div className="space-y-2">
                                  {[
                                    { label: 'Coût matière', value: h.materialCost, color: '#8B5CF6' },
                                    { label: 'Coût main-d\'œuvre', value: h.laborCost, color: '#F59E0B' },
                                    { label: 'Coût total de fabrication', value: h.totalCost, color: '#e2e8f0' },
                                    { label: 'Prix de vente conseillé', value: h.suggestedPrice, color: '#00D9FF' },
                                    { label: 'Bénéfice brut', value: h.grossProfit, color: '#00FF88' },
                                  ].map(r => (
                                    <div key={r.label} className="flex items-center justify-between">
                                      <span className="text-xs text-slate-500">{r.label}</span>
                                      <span className="text-sm font-bold" style={{ color: r.color }}>{fmt(r.value)} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
