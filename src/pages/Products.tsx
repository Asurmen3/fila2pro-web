import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Plus, X, Trash2, ShoppingCart, Calculator, ChevronDown, ChevronUp, Cpu, Layers } from 'lucide-react';
import type { ProductComponent, FilamentComponent } from '../types';
import { MATERIAL_COLORS } from '../types';

function fmt(n: number, d = 2) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

interface ProductForm {
  name: string;
  description: string;
  printTimeMinutes: number;
  assemblyTimeMinutes: number;
  laborCostPerHour: number;
  fixedCosts: number;
  marginPercent: number;
  components: Array<{ articleId: number; quantity: number }>;
  filamentComponents: Array<{ spoolId: number; weightGrams: number }>;
}

const emptyForm = (): ProductForm => ({
  name: '', description: '',
  printTimeMinutes: 0, assemblyTimeMinutes: 0,
  laborCostPerHour: 15, fixedCosts: 0.5, marginPercent: 40,
  components: [], filamentComponents: [],
});

export default function Products() {
  const articles = useLiveQuery(() => db.articles.toArray(), []) ?? [];
  const spools   = useLiveQuery(() => db.filamentSpools.toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.orderBy('createdAt').reverse().toArray(), []) ?? [];

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<ProductForm>(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Resolve components for cost calculation
  const resolvedComponents: ProductComponent[] = form.components.map(c => {
    const art = articles.find(a => a.id === c.articleId);
    if (!art) return null!;
    return { articleId: art.id!, articleName: art.name, quantity: c.quantity, unit: art.unit, unitPrice: art.unitPrice, totalCost: art.unitPrice * c.quantity };
  }).filter(Boolean);

  const resolvedFilaments: FilamentComponent[] = form.filamentComponents.map(c => {
    const s = spools.find(sp => sp.id === c.spoolId);
    if (!s) return null!;
    const pricePerGram = s.initialWeight > 0 ? s.price / s.initialWeight : 0;
    return { spoolId: s.id!, spoolLabel: `${s.brand} ${s.material} ${s.color}`, weightGrams: c.weightGrams, pricePerGram, totalCost: pricePerGram * c.weightGrams, colorHex: s.colorHex };
  }).filter(Boolean);

  const materialCost    = resolvedComponents.reduce((s, c) => s + c.totalCost, 0) + resolvedFilaments.reduce((s, c) => s + c.totalCost, 0);
  const totalMinutes    = form.printTimeMinutes + form.assemblyTimeMinutes;
  const laborCost       = (totalMinutes / 60) * form.laborCostPerHour;
  const productionCost  = materialCost + laborCost + form.fixedCosts;
  const suggestedPrice  = productionCost * (1 + form.marginPercent / 100);
  const grossProfit     = suggestedPrice - productionCost;

  function setField<K extends keyof ProductForm>(k: K, v: ProductForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function addComponent(articleId: number) {
    setForm(prev => ({ ...prev, components: [...prev.components, { articleId, quantity: 1 }] }));
  }
  function removeComponent(idx: number) {
    setForm(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== idx) }));
  }
  function updateQty(idx: number, qty: number) {
    setForm(prev => { const c = [...prev.components]; c[idx] = { ...c[idx], quantity: qty }; return { ...prev, components: c }; });
  }

  function addFilament(spoolId: number) {
    setForm(prev => ({ ...prev, filamentComponents: [...prev.filamentComponents, { spoolId, weightGrams: 0 }] }));
  }
  function removeFilament(idx: number) {
    setForm(prev => ({ ...prev, filamentComponents: prev.filamentComponents.filter((_, i) => i !== idx) }));
  }
  function updateFilamentGrams(idx: number, g: number) {
    setForm(prev => { const f = [...prev.filamentComponents]; f[idx] = { ...f[idx], weightGrams: g }; return { ...prev, filamentComponents: f }; });
  }

  async function handleSave() {
    if (!form.name.trim() || (resolvedComponents.length === 0 && resolvedFilaments.length === 0)) return;
    setSaving(true);
    const now = new Date();
    const prod = {
      name: form.name, description: form.description,
      components: resolvedComponents, filamentComponents: resolvedFilaments,
      printTimeMinutes: form.printTimeMinutes, assemblyTimeMinutes: form.assemblyTimeMinutes,
      laborCostPerHour: form.laborCostPerHour, fixedCosts: form.fixedCosts, marginPercent: form.marginPercent,
      materialCost, laborCost, totalCost: productionCost, suggestedPrice, grossProfit, createdAt: now,
    };
    const productId = await db.products.add(prod);
    await db.productionHistory.add({ productId, productName: form.name, date: now, materialCost, laborCost, totalCost: productionCost, suggestedPrice, grossProfit, marginPercent: form.marginPercent, components: resolvedComponents, filamentComponents: resolvedFilaments });

    // Deduct stock articles
    for (const comp of resolvedComponents) {
      const art = articles.find(a => a.id === comp.articleId);
      if (art) await db.articles.update(comp.articleId, { stockRemaining: Math.max(0, art.stockRemaining - comp.quantity), updatedAt: now });
    }
    // Deduct filament spools + log print history
    for (const fc of resolvedFilaments) {
      const spool = spools.find(s => s.id === fc.spoolId);
      if (spool) {
        await db.filamentSpools.update(fc.spoolId, { currentWeight: Math.max(0, spool.currentWeight - fc.weightGrams) });
        await db.spoolPrintHistory.add({ spoolId: fc.spoolId, projectName: form.name, printerName: '', weightUsed: fc.weightGrams, durationMinutes: form.printTimeMinutes, date: now, notes: '', brand: spool.brand, material: spool.material, color: spool.color, colorHex: spool.colorHex });
      }
    }
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm());
  }

  async function handleDelete(id: number) {
    if (confirm('Supprimer ce produit ?')) await db.products.delete(id);
  }

  const availableArticles = articles.filter(a => !form.components.some(c => c.articleId === a.id));
  const availableSpools   = spools.filter(s => !form.filamentComponents.some(f => f.spoolId === s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {[{ label: 'Produits créés', value: products.length }].map(s => (
            <div key={s.label} className="glass-card px-4 py-3">
              <div className="text-xl font-bold" style={{ color: '#00D9FF', fontFamily: 'Space Grotesk' }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <motion.button className="btn-primary flex items-center gap-2" onClick={() => { setForm(emptyForm()); setShowForm(true); }} whileTap={{ scale: 0.97 }}>
          <Plus size={16} /> Nouveau produit
        </motion.button>
      </div>

      {products.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center text-center">
          <Cpu size={48} className="mb-4 opacity-20" />
          <div className="text-slate-500 text-sm">Aucun produit — cliquez sur « Nouveau produit »</div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {products.map((p, i) => {
              const expanded = expandedId === p.id;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="glass-card overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : p.id!)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(0,217,255,0.2)' }}>
                        <ShoppingCart size={16} style={{ color: '#00D9FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {p.components.length} composant(s) · {(p.filamentComponents ?? []).length} filament(s) · {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-6 text-right">
                        <div><div className="text-xs text-slate-500">Coût</div><div className="text-sm font-semibold text-white">{fmt(p.totalCost)} €</div></div>
                        <div><div className="text-xs text-slate-500">Prix conseillé</div><div className="text-sm font-bold" style={{ color: '#00D9FF' }}>{fmt(p.suggestedPrice)} €</div></div>
                        <div><div className="text-xs text-slate-500">Bénéfice</div><div className="text-sm font-bold" style={{ color: '#00FF88' }}>+{fmt(p.grossProfit)} €</div></div>
                        <div className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)' }}>{fmt(p.marginPercent)}%</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button className="btn-danger py-1 px-2" onClick={e => { e.stopPropagation(); handleDelete(p.id!); }}><Trash2 size={13} /></button>
                        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(0,217,255,0.1)', overflow: 'hidden' }}>
                          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Filaments */}
                            {(p.filamentComponents ?? []).length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Layers size={12} /> Filaments</div>
                                <div className="space-y-1.5">
                                  {(p.filamentComponents ?? []).map((f, j) => (
                                    <div key={j} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.06)' }}>
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: f.colorHex }} />
                                      <span className="text-xs text-white flex-1 truncate">{f.spoolLabel}</span>
                                      <span className="text-xs text-slate-400">{fmt(f.weightGrams, 0)}g</span>
                                      <span className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>{fmt(f.totalCost)} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Components */}
                            {p.components.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Composants</div>
                                <div className="space-y-1.5">
                                  {p.components.map((c, j) => (
                                    <div key={j} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: 'rgba(0,217,255,0.04)' }}>
                                      <span className="text-xs text-white flex-1 truncate">{c.articleName}</span>
                                      <span className="text-xs text-slate-400">{c.quantity} {c.unit}</span>
                                      <span className="text-xs font-semibold" style={{ color: '#00D9FF' }}>{fmt(c.totalCost)} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Cost breakdown */}
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Coûts</div>
                              <div className="space-y-2">
                                {[
                                  { label: 'Coût matière', value: p.materialCost, color: '#8B5CF6' },
                                  { label: 'Main-d\'œuvre', value: p.laborCost, color: '#F59E0B' },
                                  { label: 'Frais fixes', value: p.fixedCosts, color: '#64748b' },
                                  { label: 'Total fabrication', value: p.totalCost, color: '#e2e8f0' },
                                  { label: 'Prix de vente', value: p.suggestedPrice, color: '#00D9FF' },
                                  { label: 'Bénéfice brut', value: p.grossProfit, color: '#00FF88' },
                                ].map(r => (
                                  <div key={r.label} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{r.label}</span>
                                    <span className="text-sm font-bold" style={{ color: r.color }}>{fmt(r.value)} €</span>
                                  </div>
                                ))}
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

      {/* Product form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(7,11,26,0.92)', backdropFilter: 'blur(8px)' }}>
            <motion.div className="w-full sm:max-w-3xl glass-card neon-border-cyan p-4 sm:p-6 overflow-y-auto"
              style={{ maxHeight: '92vh', borderRadius: '20px 20px 0 0' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Nouveau produit</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Filaments + composants → coût de revient complet</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="col-span-2">
                  <label className="label">Nom du produit *</label>
                  <input className="input-field" placeholder="ex: Lampe Dragon Ball" value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <input className="input-field" placeholder="Description…" value={form.description} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>

              {/* Filament components */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} style={{ color: '#8B5CF6' }} />
                  <label className="label" style={{ marginBottom: 0, color: '#8B5CF6' }}>Filaments utilisés</label>
                </div>
                {form.filamentComponents.length === 0 && (
                  <div className="py-3 text-center text-slate-600 text-xs rounded-xl mb-2" style={{ border: '1px dashed rgba(139,92,246,0.3)' }}>
                    Aucun filament sélectionné
                  </div>
                )}
                <div className="space-y-2 mb-2">
                  {form.filamentComponents.map((fc, idx) => {
                    const s = spools.find(sp => sp.id === fc.spoolId);
                    if (!s) return null;
                    const cost = (s.price / s.initialWeight) * fc.weightGrams;
                    const matColor = MATERIAL_COLORS[s.material];
                    return (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.colorHex }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{s.brand} {s.material} {s.color}</div>
                          <div className="text-[11px]" style={{ color: matColor }}>{fmt(s.currentWeight, 0)}g restants</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" min="0" className="input-field text-center w-20 py-1 px-2 text-sm"
                            placeholder="g" value={fc.weightGrams || ''} onChange={e => updateFilamentGrams(idx, parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-slate-500 w-4">g</span>
                          <span className="text-xs font-bold w-16 text-right" style={{ color: '#8B5CF6' }}>{fmt(cost)} €</span>
                          <button onClick={() => removeFilament(idx)} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {availableSpools.length > 0 && (
                  <select className="select-field text-sm" value="" onChange={e => { if (e.target.value) addFilament(parseInt(e.target.value)); }}>
                    <option value="">+ Ajouter une bobine de filament…</option>
                    {availableSpools.map(s => (
                      <option key={s.id} value={s.id}>{s.brand} {s.material} {s.color} — {fmt(s.currentWeight, 0)}g restants ({fmt(s.price / s.initialWeight * 1000, 2)} €/kg)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Stock article components */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={14} style={{ color: '#00D9FF' }} />
                  <label className="label" style={{ marginBottom: 0 }}>Composants du stock</label>
                </div>
                {form.components.length === 0 && (
                  <div className="py-3 text-center text-slate-600 text-xs rounded-xl mb-2" style={{ border: '1px dashed rgba(0,217,255,0.2)' }}>
                    Aucun composant sélectionné
                  </div>
                )}
                <div className="space-y-2 mb-2">
                  {form.components.map((c, idx) => {
                    const art = articles.find(a => a.id === c.articleId);
                    if (!art) return null;
                    return (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.12)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{art.name}</div>
                          <div className="text-[11px] text-slate-500">{fmt(art.unitPrice, 4)} €/{art.unit}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.01" min="0" className="input-field text-center w-20 py-1 px-2 text-sm"
                            value={c.quantity || ''} onChange={e => updateQty(idx, parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-slate-500 w-8">{art.unit}</span>
                          <span className="text-xs font-bold w-16 text-right" style={{ color: '#00D9FF' }}>{fmt(art.unitPrice * c.quantity)} €</span>
                          <button onClick={() => removeComponent(idx)} className="text-slate-600 hover:text-red-400"><X size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {availableArticles.length > 0 && (
                  <select className="select-field text-sm" value="" onChange={e => { if (e.target.value) addComponent(parseInt(e.target.value)); }}>
                    <option value="">+ Ajouter un article du stock…</option>
                    {availableArticles.map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {fmt(a.unitPrice, 4)} €/{a.unit} (stock: {fmt(a.stockRemaining, 2)} {a.unit})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Params */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                <div><label className="label">Impression (min)</label><input className="input-field" type="number" min="0" placeholder="0" value={form.printTimeMinutes || ''} onChange={e => setField('printTimeMinutes', parseInt(e.target.value) || 0)} /></div>
                <div><label className="label">Assemblage (min)</label><input className="input-field" type="number" min="0" placeholder="0" value={form.assemblyTimeMinutes || ''} onChange={e => setField('assemblyTimeMinutes', parseInt(e.target.value) || 0)} /></div>
                <div><label className="label">Taux horaire (€/h)</label><input className="input-field" type="number" step="0.5" min="0" placeholder="15" value={form.laborCostPerHour || ''} onChange={e => setField('laborCostPerHour', parseFloat(e.target.value) || 0)} /></div>
                <div><label className="label">Frais fixes (€)</label><input className="input-field" type="number" step="0.1" min="0" placeholder="0.50" value={form.fixedCosts || ''} onChange={e => setField('fixedCosts', parseFloat(e.target.value) || 0)} /></div>
                <div><label className="label">Marge (%)</label><input className="input-field" type="number" step="1" min="0" placeholder="40" value={form.marginPercent || ''} onChange={e => setField('marginPercent', parseFloat(e.target.value) || 0)} /></div>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,217,255,0.04)', border: '1px solid rgba(0,217,255,0.15)' }}>
                <div className="flex items-center gap-2 mb-4"><Calculator size={15} style={{ color: '#00D9FF' }} /><span className="text-sm font-semibold text-slate-300">Récapitulatif</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Coût matière', value: materialCost, color: '#8B5CF6' },
                    { label: 'Main-d\'œuvre', value: laborCost, color: '#F59E0B' },
                    { label: 'Frais fixes', value: form.fixedCosts, color: '#64748b' },
                    { label: 'Coût de fabrication', value: productionCost, color: '#e2e8f0' },
                    { label: 'Prix de vente', value: suggestedPrice, color: '#00D9FF' },
                    { label: 'Bénéfice brut', value: grossProfit, color: '#00FF88' },
                  ].map(r => (
                    <div key={r.label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(7,11,26,0.6)' }}>
                      <div className="text-[11px] text-slate-500 mb-1">{r.label}</div>
                      <div className="text-base font-bold" style={{ color: r.color, fontFamily: 'Space Grotesk' }}>{fmt(r.value)} €</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <motion.button className="btn-primary flex items-center gap-2"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || (resolvedComponents.length === 0 && resolvedFilaments.length === 0)}
                  whileTap={{ scale: 0.97 }}>
                  <ShoppingCart size={15} />
                  {saving ? 'Enregistrement…' : 'Créer & déduire du stock'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
