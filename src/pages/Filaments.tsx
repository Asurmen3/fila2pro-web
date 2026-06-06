import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import * as api from '../api';
import {
  Plus, Search, X, Trash2, ChevronDown, ChevronUp,
  Thermometer, Package, Clock, Edit3, Zap, AlertTriangle, FileCode,
} from 'lucide-react';
import type { FilamentSpool, MaterialType, SpoolPrintHistory } from '../types';
import { MATERIALS, MATERIAL_COLORS, SPOOL_PRESET_COLORS } from '../types';
import { readGcodeFile } from '../utils/gcodeParser';

function fmt(n: number, d = 1) { return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtDate(d: string | Date) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }

const emptyForm = (): Omit<FilamentSpool, 'id' | 'dateAdded'> => ({
  brand: '', material: 'PLA', color: 'Noir', colorHex: '#1a1a1a',
  diameter: 1.75, initialWeight: 1000, currentWeight: 1000, quantity: 1,
  price: 0, supplier: '', location: '',
  printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60, notes: '',
});

const emptyConsumption = () => ({ projectName: '', printerName: '', weightUsed: 0, durationMinutes: 0, notes: '' });

export default function Filaments() {
  const { spools, templates, refresh, refreshSpoolHistory } = useApp();

  const [search, setSearch]       = useState('');
  const [filterMat, setFilterMat] = useState<MaterialType | 'Tous'>('Tous');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [spoolHistory, setSpoolHistory] = useState<SpoolPrintHistory[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [consumptionSpoolId, setConsumptionSpoolId] = useState<number | null>(null);
  const [consumption, setConsumption] = useState(emptyConsumption());
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const gcodeInputRef = useRef<HTMLInputElement>(null);

  // Load history when spool is expanded
  useEffect(() => {
    if (expandedId !== null) {
      refreshSpoolHistory(expandedId).then(setSpoolHistory);
    } else {
      setSpoolHistory([]);
    }
  }, [expandedId, refreshSpoolHistory]);

  const filtered = spools.filter(s => {
    const q = search.toLowerCase();
    return (s.brand.toLowerCase().includes(q) || s.material.toLowerCase().includes(q) || s.color.toLowerCase().includes(q))
      && (filterMat === 'Tous' || s.material === filterMat);
  });

  const totalWeight = spools.reduce((s, sp) => s + sp.currentWeight, 0);
  const lowStock    = spools.filter(s => s.currentWeight < 200);
  const usedMaterials = [...new Set(spools.map(s => s.material))];

  function setField<K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function applyTemplate(brand: string, mat: MaterialType) {
    const t = templates.find(t => t.brand === brand && t.material === mat);
    if (t) setForm(prev => ({ ...prev, brand: t.brand, material: t.material, printTempMin: t.printTempMin, printTempMax: t.printTempMax, bedTempMin: t.bedTempMin, bedTempMax: t.bedTempMax }));
  }

  function openNew() { setForm(emptyForm()); setEditingId(null); setShowForm(true); }
  function openEdit(s: FilamentSpool) {
    setForm({ brand:s.brand, material:s.material, color:s.color, colorHex:s.colorHex, diameter:s.diameter, initialWeight:s.initialWeight, currentWeight:s.currentWeight, quantity:s.quantity??1, price:s.price, supplier:s.supplier, location:s.location, printTempMin:s.printTempMin, printTempMax:s.printTempMax, bedTempMin:s.bedTempMin, bedTempMax:s.bedTempMax, notes:s.notes });
    setEditingId(s.id!); setShowForm(true);
  }

  async function handleSave() {
    if (!form.brand.trim()) return;
    setSaving(true);
    if (editingId !== null) await api.spools.update(editingId, form);
    else await api.spools.create(form);
    await refresh();
    setSaving(false); setShowForm(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette bobine ?')) return;
    await api.spools.delete(id);
    await refresh();
  }

  async function handleConsumption() {
    const spool = spools.find(s => s.id === consumptionSpoolId);
    if (!spool || consumption.weightUsed <= 0) return;
    const newWeight = Math.max(0, spool.currentWeight - consumption.weightUsed);
    const qty = spool.quantity ?? 1;

    if (newWeight === 0 && qty > 1) {
      await api.spools.update(consumptionSpoolId!, { ...spool, currentWeight: spool.initialWeight, quantity: qty - 1 });
    } else {
      await api.spools.update(consumptionSpoolId!, { ...spool, currentWeight: newWeight });
    }

    await api.spools.addHistory(consumptionSpoolId!, {
      projectName: consumption.projectName,
      printerName: consumption.printerName,
      weightUsed: consumption.weightUsed,
      durationMinutes: consumption.durationMinutes,
      date: new Date().toISOString(),
      notes: consumption.notes,
      brand: spool.brand,
      material: spool.material,
      color: spool.color,
      colorHex: spool.colorHex,
    });

    await refresh();
    setConsumptionSpoolId(null);
    setConsumption(emptyConsumption());
  }

  async function deleteHistoryEntry(id: number) {
    await api.spools.deleteHistory(id);
    if (expandedId !== null) {
      const h = await refreshSpoolHistory(expandedId);
      setSpoolHistory(h);
    }
    await refresh();
  }

  async function handleGcodeImport(file: File) {
    setGcodeLoading(true);
    try {
      const data = await readGcodeFile(file);
      setConsumption(prev => ({ ...prev, weightUsed: data.filamentGrams ?? prev.weightUsed, durationMinutes: data.printTimeMinutes ?? prev.durationMinutes }));
    } finally { setGcodeLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Bobines en stock',     value:spools.length,                              color:'#00D9FF' },
          { label:'Stock faible (<200g)', value:lowStock.length,                            color:lowStock.length>0?'#FF8C00':'#00FF88' },
          { label:'Poids total',          value:`${fmt(totalWeight/1000,2)} kg`,            color:'#8B5CF6' },
          { label:'Matériaux',            value:usedMaterials.length,                       color:'#00FF88' },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-3">
            <div className="text-xl font-bold" style={{ color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background:'rgba(255,140,0,0.08)', border:'1px solid rgba(255,140,0,0.3)' }}>
          <AlertTriangle size={18} style={{ color:'#FF8C00', marginTop:2 }} />
          <div>
            <div className="text-sm font-semibold" style={{ color:'#FF8C00' }}>Bobines presque épuisées</div>
            <div className="text-xs text-slate-400 mt-1">{lowStock.map(s=>`${s.brand} ${s.material} ${s.color} (${s.currentWeight}g)`).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9" placeholder="Rechercher une bobine…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <motion.button className="btn-primary flex items-center gap-2 whitespace-nowrap" onClick={openNew} whileTap={{ scale:0.97 }}>
          <Plus size={16} /> Nouvelle bobine
        </motion.button>
      </div>

      {/* Material filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['Tous', ...MATERIALS.filter(m => usedMaterials.includes(m))] as const).map(mat => (
          <button key={mat} onClick={() => setFilterMat(mat as MaterialType | 'Tous')}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={filterMat === mat
              ? { background:(mat==='Tous'?'#00D9FF':MATERIAL_COLORS[mat as MaterialType])+'22', color:mat==='Tous'?'#00D9FF':MATERIAL_COLORS[mat as MaterialType], border:`1px solid ${mat==='Tous'?'#00D9FF':MATERIAL_COLORS[mat as MaterialType]}44` }
              : { background:'rgba(255,255,255,0.04)', color:'#64748b', border:'1px solid rgba(255,255,255,0.08)' }}>
            {mat}
          </button>
        ))}
      </div>

      {/* Spool list */}
      {filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center text-center">
          <Package size={48} className="mb-4 opacity-20" />
          <div className="text-slate-500 text-sm">{search||filterMat!=='Tous'?'Aucune bobine trouvée':'Aucune bobine — cliquez sur « Nouvelle bobine »'}</div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((spool, i) => {
              const pct = spool.initialWeight > 0 ? (spool.currentWeight/spool.initialWeight)*100 : 0;
              const matColor = MATERIAL_COLORS[spool.material];
              const isLow = spool.currentWeight < 200;
              const expanded = expandedId === spool.id;
              const pricePerGram = spool.initialWeight > 0 ? spool.price/spool.initialWeight : 0;
              return (
                <motion.div key={spool.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ delay:i*0.04 }}>
                  <div className="glass-card overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expanded?null:spool.id!)}>
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 border-2 flex items-center justify-center"
                        style={{ background:spool.colorHex==='#E2E8F020'?'rgba(226,232,240,0.1)':spool.colorHex, borderColor:matColor+'60' }}>
                        {spool.colorHex==='#E2E8F020'&&<span className="text-[10px] text-slate-400">T</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{spool.brand} — {spool.color}</span>
                          <span className="badge" style={{ background:matColor+'18', color:matColor, border:`1px solid ${matColor}30` }}>{spool.material}</span>
                          {(spool.quantity??1)>1&&<span className="badge font-black" style={{ background:'rgba(0,217,255,0.15)', color:'#00D9FF', border:'1px solid rgba(0,217,255,0.4)', fontSize:'0.75rem' }}>×{spool.quantity}</span>}
                          {isLow&&<span className="badge" style={{ background:'rgba(255,140,0,0.15)', color:'#FF8C00', border:'1px solid rgba(255,140,0,0.3)' }}>Stock faible</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:isLow?'#FF8C00':matColor, boxShadow:`0 0 6px ${isLow?'#FF8C00':matColor}60` }} />
                          </div>
                          <span className="text-xs font-semibold whitespace-nowrap" style={{ color:isLow?'#FF8C00':matColor }}>
                            {fmt(spool.currentWeight,0)}g / {fmt(spool.initialWeight,0)}g
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-5 text-right">
                        <div><div className="text-xs text-slate-500">Prix/kg</div><div className="text-sm font-semibold" style={{ color:'#00D9FF' }}>{(pricePerGram*1000).toFixed(1)}€</div></div>
                        <div><div className="text-xs text-slate-500">∅ {spool.diameter}mm</div><div className="text-xs text-slate-400">{spool.location||'—'}</div></div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <motion.button className="btn-primary py-1 px-2 text-xs flex items-center gap-1" onClick={e=>{e.stopPropagation();setConsumptionSpoolId(spool.id!);setConsumption(emptyConsumption());}} whileTap={{ scale:0.97 }}>
                          <Zap size={12} /> Utiliser
                        </motion.button>
                        <button className="btn-secondary py-1 px-2 text-xs" onClick={e=>{e.stopPropagation();openEdit(spool);}}><Edit3 size={13} /></button>
                        <button className="btn-danger py-1 px-2" onClick={e=>{e.stopPropagation();handleDelete(spool.id!);}}><Trash2 size={13} /></button>
                        {expanded?<ChevronUp size={16} className="text-slate-500"/>:<ChevronDown size={16} className="text-slate-500"/>}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded&&(
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ borderTop:'1px solid rgba(0,217,255,0.08)', overflow:'hidden' }}>
                          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Informations</div>
                              <div className="space-y-2">
                                {[
                                  { label:'Fournisseur', value:spool.supplier||'—' },
                                  { label:'Prix d\'achat', value:`${fmt(spool.price,2)} €` },
                                  { label:'Prix / kg', value:`${(pricePerGram*1000).toFixed(2)} €` },
                                  { label:'Emplacement', value:spool.location||'—' },
                                  { label:'Ajouté le', value:fmtDate(spool.dateAdded) },
                                ].map(r=>(
                                  <div key={r.label} className="flex justify-between"><span className="text-xs text-slate-500">{r.label}</span><span className="text-xs font-semibold text-white">{r.value}</span></div>
                                ))}
                              </div>
                              <div className="mt-3 flex gap-3">
                                <div className="flex-1 rounded-xl p-3 text-center" style={{ background:'rgba(255,140,0,0.08)', border:'1px solid rgba(255,140,0,0.2)' }}>
                                  <Thermometer size={14} className="mx-auto mb-1" style={{ color:'#FF8C00' }} />
                                  <div className="text-xs text-slate-400">Buse</div>
                                  <div className="text-sm font-bold" style={{ color:'#FF8C00' }}>{spool.printTempMin}–{spool.printTempMax}°C</div>
                                </div>
                                <div className="flex-1 rounded-xl p-3 text-center" style={{ background:'rgba(0,217,255,0.08)', border:'1px solid rgba(0,217,255,0.2)' }}>
                                  <Thermometer size={14} className="mx-auto mb-1" style={{ color:'#00D9FF' }} />
                                  <div className="text-xs text-slate-400">Plateau</div>
                                  <div className="text-sm font-bold" style={{ color:'#00D9FF' }}>{spool.bedTempMin}–{spool.bedTempMax}°C</div>
                                </div>
                              </div>
                              {spool.notes&&<div className="mt-3 text-xs text-slate-400 italic px-3 py-2 rounded-lg" style={{ background:'rgba(255,255,255,0.03)' }}>{spool.notes}</div>}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Historique d'impressions ({spoolHistory.length})</div>
                              {spoolHistory.length===0?(
                                <div className="text-xs text-slate-600 text-center py-6">Aucune impression enregistrée</div>
                              ):(
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                  {spoolHistory.map(h=>(
                                    <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background:'rgba(0,217,255,0.04)', border:'1px solid rgba(0,217,255,0.08)' }}>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-white truncate">{h.projectName||'Sans nom'}</div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          <span className="text-[11px] text-slate-500">{h.printerName||'—'}</span>
                                          <span className="text-[11px] text-slate-500">{fmtDate(h.date)}</span>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-xs font-bold" style={{ color:'#FF8C00' }}>−{fmt(h.weightUsed,0)}g</div>
                                        {h.durationMinutes>0&&<div className="flex items-center gap-1 text-[11px] text-slate-500 justify-end"><Clock size={10}/>{h.durationMinutes}min</div>}
                                      </div>
                                      <button className="text-slate-600 hover:text-red-400 transition-colors mt-0.5" onClick={()=>deleteHistoryEntry(h.id!)}><X size={12}/></button>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* Add/Edit modal */}
      <AnimatePresence>
        {showForm&&(
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ background:'rgba(7,11,26,0.9)', backdropFilter:'blur(8px)' }}>
            <motion.div className="w-full sm:max-w-2xl glass-card neon-border-cyan p-4 sm:p-6 overflow-y-auto" style={{ maxHeight:'92vh', borderRadius:'20px 20px 0 0' }} initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:30, stiffness:300 }}>
              <div className="sm:hidden w-10 h-1 rounded-full bg-slate-600 mx-auto mb-4"/>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white" style={{ fontFamily:'Space Grotesk' }}>{editingId!==null?'Modifier la bobine':'Nouvelle bobine'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              {editingId===null&&(
                <div className="mb-4">
                  <label className="label">Charger un modèle</label>
                  <select className="select-field" value="" onChange={e=>{if(!e.target.value)return;const[brand,mat]=e.target.value.split('||');applyTemplate(brand,mat as MaterialType);}}>
                    <option value="">Sélectionner un modèle…</option>
                    {templates.map(t=><option key={t.id} value={`${t.brand}||${t.material}`}>{t.brand} — {t.material}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Marque *</label><input className="input-field" placeholder="ex: Bambu Lab" value={form.brand} onChange={e=>setField('brand',e.target.value)}/></div>
                <div><label className="label">Matériau</label><select className="select-field" value={form.material} onChange={e=>setField('material',e.target.value as MaterialType)}>{MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                <div className="col-span-2">
                  <label className="label">Couleur</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {SPOOL_PRESET_COLORS.map(c=>(
                      <button key={c.hex} title={c.name} onClick={()=>{setField('color',c.name);setField('colorHex',c.hex);}}
                        className="w-7 h-7 rounded-lg border-2 transition-all"
                        style={{ background:c.hex==='#E2E8F020'?'rgba(226,232,240,0.1)':c.hex, borderColor:form.colorHex===c.hex?'#00D9FF':'transparent', boxShadow:form.colorHex===c.hex?'0 0 10px rgba(0,217,255,0.5)':'none' }}/>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-field" placeholder="Nom de la couleur" value={form.color} onChange={e=>setField('color',e.target.value)}/>
                    <input type="color" value={form.colorHex.startsWith('#E2')?'#ffffff':form.colorHex} onChange={e=>setField('colorHex',e.target.value)} className="w-12 h-10 rounded-xl cursor-pointer border-0 bg-transparent"/>
                  </div>
                </div>
                <div><label className="label">Nombre de bobines</label><input className="input-field" type="number" step="1" min="1" value={form.quantity||1} onChange={e=>setField('quantity',parseInt(e.target.value)||1)}/></div>
                <div><label className="label">Diamètre</label><select className="select-field" value={form.diameter} onChange={e=>setField('diameter',parseFloat(e.target.value) as 1.75|2.85)}><option value={1.75}>1.75 mm</option><option value={2.85}>2.85 mm</option></select></div>
                <div><label className="label">Prix d'achat (€)</label><input className="input-field" type="number" step="0.01" min="0" value={form.price||''} onChange={e=>setField('price',parseFloat(e.target.value)||0)}/></div>
                <div><label className="label">Poids initial (g)</label><input className="input-field" type="number" step="1" min="0" value={form.initialWeight||''} onChange={e=>setField('initialWeight',parseFloat(e.target.value)||0)}/></div>
                <div><label className="label">Poids actuel (g)</label><input className="input-field" type="number" step="1" min="0" value={form.currentWeight||''} onChange={e=>setField('currentWeight',parseFloat(e.target.value)||0)}/></div>
                <div><label className="label" style={{ color:'#FF8C00' }}>Buse min (°C)</label><input className="input-field" type="number" step="1" value={form.printTempMin||''} onChange={e=>setField('printTempMin',parseInt(e.target.value)||0)}/></div>
                <div><label className="label" style={{ color:'#FF8C00' }}>Buse max (°C)</label><input className="input-field" type="number" step="1" value={form.printTempMax||''} onChange={e=>setField('printTempMax',parseInt(e.target.value)||0)}/></div>
                <div><label className="label" style={{ color:'#00D9FF' }}>Plateau min (°C)</label><input className="input-field" type="number" step="1" value={form.bedTempMin||''} onChange={e=>setField('bedTempMin',parseInt(e.target.value)||0)}/></div>
                <div><label className="label" style={{ color:'#00D9FF' }}>Plateau max (°C)</label><input className="input-field" type="number" step="1" value={form.bedTempMax||''} onChange={e=>setField('bedTempMax',parseInt(e.target.value)||0)}/></div>
                <div><label className="label">Fournisseur</label><input className="input-field" placeholder="ex: Bambu Lab Store" value={form.supplier} onChange={e=>setField('supplier',e.target.value)}/></div>
                <div><label className="label">Emplacement</label><input className="input-field" placeholder="ex: Étagère A1" value={form.location} onChange={e=>setField('location',e.target.value)}/></div>
                <div className="col-span-2"><label className="label">Notes</label><input className="input-field" placeholder="Conseils d'impression…" value={form.notes} onChange={e=>setField('notes',e.target.value)}/></div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button className="btn-secondary" onClick={()=>setShowForm(false)}>Annuler</button>
                <motion.button className="btn-primary" onClick={handleSave} disabled={saving} whileTap={{ scale:0.97 }}>{saving?'Enregistrement…':editingId!==null?'Mettre à jour':'Ajouter la bobine'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consumption dialog */}
      <AnimatePresence>
        {consumptionSpoolId!==null&&(()=>{
          const spool=spools.find(s=>s.id===consumptionSpoolId);
          return(
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ background:'rgba(7,11,26,0.9)', backdropFilter:'blur(8px)' }}>
              <motion.div className="w-full max-w-md glass-card neon-border-purple p-6" initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:20 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Enregistrer une impression</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{spool?.brand} {spool?.material} {spool?.color} — {spool?.currentWeight}g{(spool?.quantity??1)>1&&<span style={{ color:'#00D9FF' }}> · ×{spool?.quantity}</span>}</p>
                  </div>
                  <button onClick={()=>setConsumptionSpoolId(null)} className="text-slate-500 hover:text-white"><X size={18}/></button>
                </div>
                <input ref={gcodeInputRef} type="file" accept=".gcode,.gc,.g,.gco" className="hidden" onChange={e=>{if(e.target.files?.[0])handleGcodeImport(e.target.files[0]);}}/>
                <motion.button className="w-full flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background:'rgba(139,92,246,0.1)', border:'1px dashed rgba(139,92,246,0.4)', color:'#8B5CF6' }} onClick={()=>gcodeInputRef.current?.click()} whileTap={{ scale:0.97 }} disabled={gcodeLoading}>
                  <FileCode size={16}/>{gcodeLoading?'Lecture du G-code…':'Importer un fichier G-code'}
                </motion.button>
                <div className="space-y-3">
                  <div><label className="label">Projet</label><input className="input-field" placeholder="ex: Lampe Dragon Ball" value={consumption.projectName} onChange={e=>setConsumption(p=>({...p,projectName:e.target.value}))}/></div>
                  <div><label className="label">Imprimante</label><input className="input-field" placeholder="ex: Bambu Lab X1C" value={consumption.printerName} onChange={e=>setConsumption(p=>({...p,printerName:e.target.value}))}/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Poids utilisé (g) *</label><input className="input-field" type="number" step="0.1" min="0" value={consumption.weightUsed||''} onChange={e=>setConsumption(p=>({...p,weightUsed:parseFloat(e.target.value)||0}))}/></div>
                    <div><label className="label">Durée (min)</label><input className="input-field" type="number" step="1" min="0" value={consumption.durationMinutes||''} onChange={e=>setConsumption(p=>({...p,durationMinutes:parseInt(e.target.value)||0}))}/></div>
                  </div>
                  {consumption.weightUsed>0&&spool&&(
                    <div className="rounded-xl px-3 py-2 text-xs" style={{ background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)' }}>
                      <span className="text-slate-400">Coût estimé : </span>
                      <span className="font-bold" style={{ color:'#8B5CF6' }}>{((spool.price/spool.initialWeight)*consumption.weightUsed).toFixed(3)} €</span>
                      <span className="text-slate-400"> · Restant : </span>
                      <span className="font-bold" style={{ color:consumption.weightUsed>=spool.currentWeight?'#FF2D55':'#00FF88' }}>{Math.max(0,spool.currentWeight-consumption.weightUsed)}g</span>
                    </div>
                  )}
                  <div><label className="label">Notes</label><input className="input-field" placeholder="Paramètres, qualité…" value={consumption.notes} onChange={e=>setConsumption(p=>({...p,notes:e.target.value}))}/></div>
                </div>
                <div className="flex gap-3 justify-end mt-5">
                  <button className="btn-secondary" onClick={()=>setConsumptionSpoolId(null)}>Annuler</button>
                  <motion.button className="btn-primary flex items-center gap-2" onClick={handleConsumption} disabled={consumption.weightUsed<=0} whileTap={{ scale:0.97 }}>
                    <Zap size={14}/> Enregistrer
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
