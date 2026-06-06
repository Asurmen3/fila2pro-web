import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Download, Copy, Check, Package, Layers, Store, CheckCircle2 } from 'lucide-react';

function fmt(n: number, d = 2) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d }); }

interface ShoppingItem {
  type: 'spool' | 'article';
  name: string;
  detail: string;
  supplier: string;
  priceHint: string;
}

export default function Shopping() {
  const { articles, spools } = useApp();
  const [copied, setCopied] = useState(false);

  // Articles sous le seuil d'alerte
  const lowArticles: ShoppingItem[] = articles
    .filter(a => a.alertThreshold && a.stockRemaining <= a.alertThreshold)
    .map(a => ({
      type: 'article',
      name: a.name,
      detail: `${fmt(a.stockRemaining, 2)} ${a.unit} restants (seuil ${a.alertThreshold})`,
      supplier: a.supplier || 'Fournisseur inconnu',
      priceHint: `~${fmt(a.purchasePrice, 2)} €`,
    }));

  // Bobines faibles (<200g) sans backup (quantity <= 1)
  const lowSpools: ShoppingItem[] = spools
    .filter(s => s.currentWeight < 200 && (s.quantity ?? 1) <= 1)
    .map(s => ({
      type: 'spool',
      name: `${s.brand} ${s.material} ${s.color}`,
      detail: `${fmt(s.currentWeight, 0)} g restants`,
      supplier: s.supplier || 'Fournisseur inconnu',
      priceHint: `~${fmt(s.price, 2)} €`,
    }));

  const allItems = [...lowSpools, ...lowArticles];

  // Groupement par fournisseur
  const bySupplier = new Map<string, ShoppingItem[]>();
  allItems.forEach(it => {
    const list = bySupplier.get(it.supplier) ?? [];
    list.push(it);
    bySupplier.set(it.supplier, list);
  });
  const suppliers = [...bySupplier.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Génération texte
  function buildText() {
    let txt = `LISTE DE COURSES — FILA2PRO\n${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(40)}\n\n`;
    suppliers.forEach(([supplier, items]) => {
      txt += `📦 ${supplier}\n`;
      items.forEach(it => { txt += `  ☐ ${it.name} — ${it.detail} (${it.priceHint})\n`; });
      txt += '\n';
    });
    txt += `${'='.repeat(40)}\nTotal : ${allItems.length} article(s) à réapprovisionner`;
    return txt;
  }

  function handleExport() {
    const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-courses-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponible */ }
  }

  if (allItems.length === 0) {
    return (
      <div className="glass-card p-16 flex flex-col items-center text-center">
        <CheckCircle2 size={48} style={{ color: '#00FF88', opacity: 0.5 }} className="mb-4" />
        <div className="text-slate-300 text-sm font-semibold">Aucun réapprovisionnement nécessaire</div>
        <div className="text-slate-600 text-xs mt-1">Tous vos stocks sont au-dessus des seuils d'alerte</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2.5">
            <div className="text-xl font-bold" style={{ color: '#FF8C00', fontFamily: 'Space Grotesk' }}>{allItems.length}</div>
            <div className="text-xs text-slate-500">À racheter</div>
          </div>
          <div className="glass-card px-4 py-2.5">
            <div className="text-xl font-bold" style={{ color: '#00D9FF', fontFamily: 'Space Grotesk' }}>{suppliers.length}</div>
            <div className="text-xs text-slate-500">Fournisseurs</div>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button className="btn-secondary flex items-center gap-2" onClick={handleCopy} whileTap={{ scale: 0.97 }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copié !' : 'Copier'}
          </motion.button>
          <motion.button className="btn-primary flex items-center gap-2" onClick={handleExport} whileTap={{ scale: 0.97 }}>
            <Download size={15} /> Exporter
          </motion.button>
        </div>
      </div>

      {/* Liste par fournisseur */}
      <div className="space-y-3">
        {suppliers.map(([supplier, items], si) => (
          <motion.div key={supplier} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.06 }}>
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(0,217,255,0.1)', background: 'rgba(0,217,255,0.03)' }}>
                <Store size={15} style={{ color: '#00D9FF' }} />
                <span className="text-sm font-bold text-white">{supplier}</span>
                <span className="badge ml-auto" style={{ background: 'rgba(0,217,255,0.12)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.3)' }}>{items.length} article{items.length > 1 ? 's' : ''}</span>
              </div>
              <div>
                {items.map((it, i) => {
                  const Icon = it.type === 'spool' ? Layers : Package;
                  const color = it.type === 'spool' ? '#8B5CF6' : '#00D9FF';
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(0,217,255,0.05)' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{it.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#FF8C00' }}>{it.detail}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-400 flex-shrink-0">{it.priceHint}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
        <ShoppingCart size={13} />
        <span>Liste générée automatiquement depuis les stocks faibles. Les bobines avec stock de secours (×2+) ne sont pas listées.</span>
      </div>
    </div>
  );
}
