import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import * as api from '../api';
import { Plus, Search, Edit3, Trash2, AlertTriangle, Package, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Article, Category, Unit } from '../types';

const CATEGORIES: Category[] = ['Filaments 3D','Électronique','Éclairage','Visserie','Consommables','Emballage','Autres'];
const UNITS: Unit[] = ['g','kg','m','cm','mm','unité','lot','paire','rouleau','ml','L'];
const CATEGORY_COLORS: Record<Category, string> = {
  'Filaments 3D':'#00D9FF','Électronique':'#8B5CF6','Éclairage':'#F59E0B',
  'Visserie':'#64748b','Consommables':'#10B981','Emballage':'#FF8C00','Autres':'#94a3b8',
};
function fmt(n: number, d = 2) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d }); }

const emptyForm = () => ({ name:'', category:'Filaments 3D' as Category, supplier:'', purchasePrice:0, purchaseQuantity:1, unit:'unité' as Unit, supplierRef:'', alertThreshold:0 });

export default function Stock() {
  const { articles, refresh } = useApp();
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState<Category | 'Toutes'>('Toutes');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    return (a.name.toLowerCase().includes(q) || a.supplier.toLowerCase().includes(q)) && (filterCat === 'Toutes' || a.category === filterCat);
  });
  const unitPrice = form.purchaseQuantity > 0 ? form.purchasePrice / form.purchaseQuantity : 0;

  function openNew() { setForm(emptyForm()); setEditingId(null); setShowForm(true); }
  function openEdit(a: Article) {
    setForm({ name:a.name, category:a.category, supplier:a.supplier, purchasePrice:a.purchasePrice, purchaseQuantity:a.purchaseQuantity, unit:a.unit, supplierRef:a.supplierRef??'', alertThreshold:a.alertThreshold??0 });
    setEditingId(a.id!); setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, unitPrice };
    if (editingId !== null) {
      const art = articles.find(a => a.id === editingId)!;
      await api.articles.update(editingId, { ...data, stockRemaining: art.stockRemaining });
    } else {
      await api.articles.create({ ...data, stockRemaining: form.purchaseQuantity, createdAt: new Date(), updatedAt: new Date() });
    }
    await refresh();
    setSaving(false); setShowForm(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet article ?')) return;
    await api.articles.delete(id);
    await refresh();
  }

  function setField<K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9 text-sm" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-auto text-sm" style={{ minWidth: 120 }} value={filterCat} onChange={e => setFilterCat(e.target.value as Category | 'Toutes')}>
          <option value="Toutes">Toutes</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <motion.button className="btn-primary flex items-center gap-1 px-3 whitespace-nowrap text-sm" onClick={openNew} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /><span className="hidden sm:inline">Ajouter</span>
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label:'Articles', value:articles.length, color:'#00D9FF' },
          { label:'Valeur stock', value:articles.reduce((s,a)=>s+a.stockRemaining*a.unitPrice,0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+'€', color:'#8B5CF6' },
          { label:'Alertes', value:articles.filter(a=>a.alertThreshold&&a.stockRemaining<=a.alertThreshold).length, color:'#FF8C00' },
          { label:'Catégories', value:new Set(articles.map(a=>a.category)).size, color:'#00FF88' },
        ].map(s => (
          <div key={s.label} className="glass-card px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="text-lg sm:text-xl font-bold" style={{ color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 && <div className="glass-card p-10 flex flex-col items-center"><Package size={36} className="mb-2 opacity-20" /><div className="text-slate-600 text-sm">Aucun article</div></div>}
        <AnimatePresence>
          {filtered.map((a, i) => {
            const isLow = !!(a.alertThreshold && a.stockRemaining <= a.alertThreshold);
            const catColor = CATEGORY_COLORS[a.category];
            const expanded = expandedId === a.id;
            return (
              <motion.div key={a.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ delay:i*0.03 }}>
                <div className="glass-card overflow-hidden">
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : a.id!)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{a.name}</span>
                        {isLow && <AlertTriangle size={13} style={{ color:'#FF8C00' }} />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge text-[10px]" style={{ background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}30` }}>{a.category}</span>
                        <span className="text-xs font-semibold" style={{ color:isLow?'#FF2D55':'#00FF88' }}>{fmt(a.stockRemaining,2)} {a.unit}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color:'#00D9FF' }}>{fmt(a.unitPrice,4)} €</div>
                      <div className="text-[10px] text-slate-500">/{a.unit}</div>
                    </div>
                    {expanded ? <ChevronUp size={15} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={15} className="text-slate-500 flex-shrink-0" />}
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ borderTop:'1px solid rgba(0,217,255,0.08)', overflow:'hidden' }}>
                        <div className="p-3 space-y-2">
                          {a.supplier && <div className="flex justify-between text-xs"><span className="text-slate-500">Fournisseur</span><span className="text-white font-medium">{a.supplier}</span></div>}
                          <div className="flex justify-between text-xs"><span className="text-slate-500">Prix achat</span><span className="text-white font-medium">{fmt(a.purchasePrice,2)} € / {fmt(a.purchaseQuantity,0)} {a.unit}</span></div>
                          <div className="flex gap-2 pt-1">
                            <button className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 flex-1 justify-center" onClick={() => openEdit(a)}><Edit3 size={12} /> Modifier</button>
                            <button className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1 flex-1 justify-center" onClick={() => handleDelete(a.id!)}><Trash2 size={12} /> Supprimer</button>
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

      {/* Desktop table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(0,217,255,0.1)' }}>
                {['Article','Catégorie','Fournisseur','Prix achat','Qté','Unité','Prix unitaire','Stock restant','⚠',''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-slate-600 text-sm"><Package size={32} className="mx-auto mb-2 opacity-30" />Aucun article</td></tr>}
              <AnimatePresence>
                {filtered.map((a, i) => {
                  const isLow = !!(a.alertThreshold && a.stockRemaining <= a.alertThreshold);
                  const catColor = CATEGORY_COLORS[a.category];
                  return (
                    <motion.tr key={a.id} className="table-row" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }} transition={{ delay:i*0.04 }}>
                      <td className="px-4 py-3"><div className="text-sm font-semibold text-white">{a.name}</div>{a.supplierRef && <div className="text-xs text-slate-600">Réf: {a.supplierRef}</div>}</td>
                      <td className="px-4 py-3"><span className="badge" style={{ background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}30` }}>{a.category}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-400">{a.supplier||'—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{fmt(a.purchasePrice,2)} €</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{fmt(a.purchaseQuantity,0)}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{a.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color:'#00D9FF' }}>{fmt(a.unitPrice,4)} €/{a.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color:isLow?'#FF2D55':'#00FF88' }}>{fmt(a.stockRemaining,2)} {a.unit}</td>
                      <td className="px-4 py-3">{isLow && <AlertTriangle size={15} style={{ color:'#FF8C00' }} />}</td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button className="btn-secondary py-1 px-2 text-xs" onClick={() => openEdit(a)}><Edit3 size={13} /></button><button className="btn-danger py-1 px-2" onClick={() => handleDelete(a.id!)}><Trash2 size={13} /></button></div></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ background:'rgba(7,11,26,0.88)', backdropFilter:'blur(6px)' }}>
            <motion.div className="w-full sm:max-w-2xl glass-card neon-border-cyan p-4 sm:p-6 overflow-y-auto" style={{ maxHeight:'92vh', borderRadius:'20px 20px 0 0' }} initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:30, stiffness:300 }}>
              <div className="sm:hidden w-10 h-1 rounded-full bg-slate-600 mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base sm:text-lg font-bold text-white" style={{ fontFamily:'Space Grotesk' }}>{editingId !== null ? 'Modifier' : 'Nouvel article'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2"><label className="label">Nom *</label><input className="input-field" placeholder="ex: PLA Noir 1kg" value={form.name} onChange={e => setField('name',e.target.value)} /></div>
                <div><label className="label">Catégorie</label><select className="select-field" value={form.category} onChange={e => setField('category',e.target.value as Category)}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="label">Fournisseur</label><input className="input-field" value={form.supplier} onChange={e => setField('supplier',e.target.value)} /></div>
                <div><label className="label">Prix d'achat (€) *</label><input className="input-field" type="number" step="0.01" min="0" value={form.purchasePrice||''} onChange={e => setField('purchasePrice',parseFloat(e.target.value)||0)} /></div>
                <div><label className="label">Quantité achetée *</label><input className="input-field" type="number" step="0.001" min="0" value={form.purchaseQuantity||''} onChange={e => setField('purchaseQuantity',parseFloat(e.target.value)||0)} /></div>
                <div><label className="label">Unité</label><select className="select-field" value={form.unit} onChange={e => setField('unit',e.target.value as Unit)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="label">Prix unitaire calculé</label><div className="input-field" style={{ color:'#00D9FF', fontWeight:600, cursor:'default' }}>{unitPrice.toFixed(6)} € / {form.unit}</div></div>
                <div><label className="label">Référence</label><input className="input-field" placeholder="optionnel" value={form.supplierRef} onChange={e => setField('supplierRef',e.target.value)} /></div>
                <div><label className="label">Seuil d'alerte</label><input className="input-field" type="number" step="1" min="0" value={form.alertThreshold||''} onChange={e => setField('alertThreshold',parseFloat(e.target.value)||0)} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <motion.button className="btn-primary flex-1" onClick={handleSave} disabled={saving} whileTap={{ scale:0.97 }}>{saving?'Enregistrement…':editingId!==null?'Mettre à jour':'Ajouter'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
