import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { TrendingUp, Award, Layers, Euro, BarChart3, PieChart as PieIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { MATERIAL_COLORS } from '../types';

function fmt(n: number, d = 2) { return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function Stats() {
  const { productionHistory, spoolHistory } = useApp();

  // ── Données mensuelles (12 derniers mois) ──
  const now = new Date();
  const monthKeys: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }

  const monthlyData = monthKeys.map(({ key, label }) => {
    const recs = productionHistory.filter(h => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    });
    return {
      mois: label,
      CA: +recs.reduce((s, h) => s + h.suggestedPrice, 0).toFixed(2),
      coût: +recs.reduce((s, h) => s + h.totalCost, 0).toFixed(2),
      bénéfice: +recs.reduce((s, h) => s + h.grossProfit, 0).toFixed(2),
      produits: recs.length,
    };
  });

  // ── Top produits par bénéfice ──
  const prodMap = new Map<string, { count: number; profit: number; revenue: number }>();
  productionHistory.forEach(h => {
    const e = prodMap.get(h.productName) ?? { count: 0, profit: 0, revenue: 0 };
    e.count += 1; e.profit += h.grossProfit; e.revenue += h.suggestedPrice;
    prodMap.set(h.productName, e);
  });
  const topProducts = [...prodMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 6);

  // ── Matériaux consommés ──
  const matMap = new Map<string, number>();
  spoolHistory.forEach(h => matMap.set(h.material, (matMap.get(h.material) ?? 0) + h.weightUsed));
  const matData = [...matMap.entries()]
    .map(([name, value]) => ({ name, value: +value.toFixed(0) }))
    .sort((a, b) => b.value - a.value);

  // ── KPI globaux ──
  const totalCA = productionHistory.reduce((s, h) => s + h.suggestedPrice, 0);
  const totalProfit = productionHistory.reduce((s, h) => s + h.grossProfit, 0);
  const totalConsumed = spoolHistory.reduce((s, h) => s + h.weightUsed, 0);
  const bestProduct = topProducts[0];

  const kpis = [
    { label: 'CA total', value: `${fmt(totalCA)} €`, icon: Euro, color: '#00D9FF' },
    { label: 'Bénéfice total', value: `${fmt(totalProfit)} €`, icon: TrendingUp, color: '#00FF88' },
    { label: 'Filament consommé', value: `${fmt(totalConsumed / 1000, 2)} kg`, icon: Layers, color: '#8B5CF6' },
    { label: 'Produit star', value: bestProduct?.name ?? '—', icon: Award, color: '#FF8C00', small: true },
  ];

  const hasData = productionHistory.length > 0 || spoolHistory.length > 0;

  if (!hasData) {
    return (
      <div className="glass-card p-16 flex flex-col items-center text-center">
        <BarChart3 size={48} className="mb-4 opacity-20" />
        <div className="text-slate-500 text-sm">Aucune donnée à analyser pour le moment</div>
        <div className="text-slate-600 text-xs mt-1">Créez des produits et enregistrez des impressions pour voir vos statistiques</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="glass-card p-4 relative overflow-hidden" style={{ boxShadow: `0 0 15px ${k.color}18` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}18`, border: `1px solid ${k.color}40` }}>
                  <Icon size={16} style={{ color: k.color }} />
                </div>
                <div className={`font-black ${k.small ? 'text-base truncate' : 'text-2xl'}`} style={{ color: k.color, fontFamily: 'Space Grotesk' }}>{k.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Évolution mensuelle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={16} style={{ color: '#00D9FF' }} /><span className="text-sm font-semibold text-slate-300">Évolution mensuelle (12 mois)</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.06)" />
              <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background: '#0D1530', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${fmt(v)} €`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="CA" stroke="#00D9FF" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bénéfice" stroke="#00FF88" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="coût" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top produits */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4"><Award size={16} style={{ color: '#FF8C00' }} /><span className="text-sm font-semibold text-slate-300">Produits les plus rentables</span></div>
            {topProducts.length === 0 ? <div className="py-8 text-center text-slate-600 text-sm">Aucun produit</div> : (
              <div className="space-y-2">
                {topProducts.map((p, i) => {
                  const max = topProducts[0].profit || 1;
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className="w-5 text-center text-xs font-bold" style={{ color: i === 0 ? '#FF8C00' : '#64748b' }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                          <span className="text-xs font-bold ml-2" style={{ color: '#00FF88' }}>+{fmt(p.profit)} €</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(p.profit / max) * 100}%`, background: 'linear-gradient(90deg,#00D9FF,#00FF88)' }} />
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 w-10 text-right">×{p.count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Matériaux consommés */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4"><PieIcon size={16} style={{ color: '#8B5CF6' }} /><span className="text-sm font-semibold text-slate-300">Matériaux consommés</span></div>
            {matData.length === 0 ? <div className="py-8 text-center text-slate-600 text-sm">Aucune impression enregistrée</div> : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={matData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value">
                      {matData.map(e => <Cell key={e.name} fill={MATERIAL_COLORS[e.name as keyof typeof MATERIAL_COLORS] ?? '#94a3b8'} stroke="transparent" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0D1530', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${fmt(v, 0)} g`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {matData.slice(0, 6).map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: MATERIAL_COLORS[d.name as keyof typeof MATERIAL_COLORS] ?? '#94a3b8' }} />
                      <span className="text-slate-400">{d.name}</span>
                      <span className="ml-auto font-semibold text-slate-300">{fmt(d.value, 0)} g</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Produits fabriqués par mois */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4"><BarChart3 size={16} style={{ color: '#00FF88' }} /><span className="text-sm font-semibold text-slate-300">Volume de production mensuel</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.06)" />
              <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0D1530', border: '1px solid rgba(0,217,255,0.2)', borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${v} produit(s)`]} />
              <Bar dataKey="produits" fill="#00FF88" radius={[6, 6, 0, 0]} name="Produits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
