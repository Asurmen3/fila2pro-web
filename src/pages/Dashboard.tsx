import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { TrendingUp, Package, Cpu, DollarSign, AlertTriangle, BarChart3, Layers, Thermometer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { MATERIAL_COLORS } from '../types';

const COLORS = ['#00D9FF', '#8B5CF6', '#00FF88', '#FF8C00', '#FF2D55', '#F59E0B', '#10B981'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

function fmt(n: number, d = 2) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function Dashboard() {
  const articles   = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  const spools     = useLiveQuery(() => db.filamentSpools.toArray(), []) ?? [];
  const history    = useLiveQuery(() => db.productionHistory.orderBy('date').toArray(), []) ?? [];
  const spoolHist  = useLiveQuery(() => db.spoolPrintHistory.orderBy('date').reverse().toArray(), []) ?? [];

  // Stock stats
  const stockValue      = articles.reduce((s, a) => s + a.stockRemaining * a.unitPrice, 0);
  const totalMaterialCost = history.reduce((s, h) => s + h.materialCost, 0);
  const avgMargin       = history.length > 0 ? history.reduce((s, h) => s + h.marginPercent, 0) / history.length : 0;

  // Filament stats
  const totalFilamentWeight = spools.reduce((s, sp) => s + sp.currentWeight, 0);
  const lowStockSpools  = spools.filter(s => s.currentWeight < 200);
  const lowStockArticles = articles.filter(a => a.alertThreshold && a.stockRemaining <= a.alertThreshold);
  const allAlerts       = [...lowStockSpools.map(s => `${s.brand} ${s.material} (${s.currentWeight}g)`), ...lowStockArticles.map(a => `${a.name} (${a.stockRemaining} ${a.unit})`)];

  // 30-day filament consumption
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const consumption30d = spoolHist.filter(h => new Date(h.date) >= thirtyDaysAgo).reduce((s, h) => s + h.weightUsed, 0);

  // Chart: last 8 productions
  const chartData = history.slice(-8).map(h => ({
    name: h.productName.length > 10 ? h.productName.slice(0, 10) + '…' : h.productName,
    coût: +h.totalCost.toFixed(2),
    prix: +h.suggestedPrice.toFixed(2),
    marge: +h.grossProfit.toFixed(2),
  }));

  // Material distribution for pie
  const matMap = new Map<string, number>();
  spools.forEach(s => matMap.set(s.material, (matMap.get(s.material) ?? 0) + s.currentWeight));
  const matPie = Array.from(matMap.entries()).map(([name, value]) => ({ name, value: +value.toFixed(0) }));

  // Category breakdown for stock pie
  const catMap = new Map<string, number>();
  articles.forEach(a => {
    const val = a.stockRemaining * a.unitPrice;
    catMap.set(a.category, (catMap.get(a.category) ?? 0) + val);
  });
  const catPie = Array.from(catMap.entries()).map(([name, value]) => ({ name, value: +value.toFixed(2) }));

  const statCards = [
    { label: 'Coût matière total',   value: `${fmt(totalMaterialCost)} €`, icon: DollarSign, color: '#00D9FF', sub: `${history.length} production(s)` },
    { label: 'Valeur stock composants', value: `${fmt(stockValue)} €`,    icon: Package,    color: '#8B5CF6', sub: `${articles.length} article(s)` },
    { label: 'Produits fabriqués',   value: history.length.toString(),     icon: Cpu,        color: '#00FF88', sub: 'dans l\'historique' },
    { label: 'Marge moyenne',        value: `${fmt(avgMargin)} %`,         icon: TrendingUp, color: '#FF8C00', sub: avgMargin >= 30 ? 'Bonne rentabilité' : 'À optimiser' },
  ];

  const filamentCards = [
    { label: 'Bobines en stock',      value: spools.length.toString(),           color: '#00D9FF' },
    { label: 'Poids total filament',  value: `${fmt(totalFilamentWeight / 1000, 2)} kg`, color: '#8B5CF6' },
    { label: 'Stock faible (<200g)',  value: lowStockSpools.length.toString(),   color: lowStockSpools.length > 0 ? '#FF8C00' : '#00FF88' },
    { label: 'Consommé (30 jours)',   value: `${fmt(consumption30d, 0)} g`,       color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {allAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.3)' }}>
            <AlertTriangle size={18} style={{ color: '#FF8C00', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: '#FF8C00' }}>Stock faible détecté ({allAlerts.length} élément{allAlerts.length > 1 ? 's' : ''})</div>
              <div className="text-xs text-slate-400 mt-1">{allAlerts.join(' · ')}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Filament section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} style={{ color: '#8B5CF6' }} />
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Filaments</span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {filamentCards.map((s, i) => (
            <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="glass-card-purple p-4 relative overflow-hidden hover:scale-[1.02] transition-transform duration-200"
                style={{ boxShadow: `0 0 15px ${s.color}22` }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 -translate-y-4 translate-x-4"
                  style={{ background: s.color, filter: 'blur(15px)' }} />
                <div className="text-2xl font-black mb-1" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Manufacturing section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} style={{ color: '#00D9FF' }} />
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Fabrication</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} custom={i + 4} initial="hidden" animate="visible" variants={cardVariants}>
                <div className="glass-card p-5 relative overflow-hidden hover:scale-[1.02] transition-transform duration-200"
                  style={{ boxShadow: `0 0 20px ${s.color}22` }}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6"
                    style={{ background: s.color, filter: 'blur(20px)' }} />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
                    <Icon size={18} style={{ color: s.color }} />
                  </div>
                  <div className="stat-value mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs font-semibold text-slate-400 mt-1">{s.label}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{s.sub}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Productions chart */}
        <motion.div className="xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="glass-card p-5 h-72">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} style={{ color: '#00D9FF' }} />
              <span className="text-sm font-semibold text-slate-300">Dernières productions</span>
            </div>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">Aucune production enregistrée</div>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                  <Tooltip contentStyle={{ background: '#0D1530', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${fmt(v)} €`]} />
                  <Bar dataKey="coût" fill="#8B5CF6" radius={[6,6,0,0]} name="Coût total" />
                  <Bar dataKey="prix" fill="#00D9FF" radius={[6,6,0,0]} name="Prix de vente" />
                  <Bar dataKey="marge" fill="#00FF88" radius={[6,6,0,0]} name="Bénéfice" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Filament distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="glass-card p-5 h-72">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} style={{ color: '#8B5CF6' }} />
              <span className="text-sm font-semibold text-slate-300">Stock par matériau</span>
            </div>
            {matPie.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">Aucune bobine</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="62%">
                  <PieChart>
                    <Pie data={matPie} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                      {matPie.map((entry) => (
                        <Cell key={entry.name} fill={MATERIAL_COLORS[entry.name as keyof typeof MATERIAL_COLORS] ?? '#94a3b8'} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0D1530', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${v}g`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 space-y-1">
                  {matPie.slice(0, 4).map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MATERIAL_COLORS[d.name as keyof typeof MATERIAL_COLORS] ?? '#94a3b8' }} />
                      <span className="text-slate-400">{d.name}</span>
                      <span className="ml-auto font-semibold text-slate-300">{fmt(d.value, 0)}g</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent prints & recent productions side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent prints */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer size={16} style={{ color: '#FF8C00' }} />
              <span className="text-sm font-semibold text-slate-300">Dernières impressions</span>
            </div>
            {spoolHist.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm">Aucune impression enregistrée</div>
            ) : (
              spoolHist.slice(0, 5).map((h, i) => (
                <div key={h.id ?? i} className="table-row flex items-center gap-3 py-2.5 px-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MATERIAL_COLORS[h.material as keyof typeof MATERIAL_COLORS] ?? '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{h.projectName || 'Sans nom'}</div>
                    <div className="text-xs text-slate-500">{h.brand} {h.material} · {h.printerName || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: '#FF8C00' }}>−{fmt(h.weightUsed, 0)}g</div>
                    <div className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent productions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} style={{ color: '#00D9FF' }} />
              <span className="text-sm font-semibold text-slate-300">Dernières productions</span>
            </div>
            {history.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm">Aucune production enregistrée</div>
            ) : (
              history.slice(-5).reverse().map((h, i) => (
                <div key={h.id ?? i} className="table-row flex items-center gap-3 py-2.5 px-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{h.productName}</div>
                    <div className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: '#00D9FF' }}>{fmt(h.suggestedPrice)} €</div>
                    <div className="text-xs" style={{ color: '#00FF88' }}>+{fmt(h.grossProfit)} €</div>
                  </div>
                  <div className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)' }}>
                    {fmt(h.marginPercent)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
