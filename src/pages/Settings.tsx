import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import * as api from '../api';
import { Download, Upload, Trash2, Zap, Settings2, CheckCircle } from 'lucide-react';
import type { AppSettings } from '../types';

function fmt(n: number, d = 2) { return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

export default function Settings() {
  const { settings, saveSettings, refresh } = useApp();
  const [form, setForm]       = useState<AppSettings>(settings);
  const [saved, setSaved]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg]         = useState('');

  function setField<K extends keyof AppSettings>(k: K, v: AppSettings[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await api.backup.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fila2pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('✅ Backup exporté !');
    } catch { setMsg('❌ Erreur lors de l\'export'); }
    finally { setExporting(false); setTimeout(() => setMsg(''), 4000); }
  }

  async function handleImport(file: File) {
    if (!confirm('⚠️ L\'import va REMPLACER toutes vos données. Continuer ?')) return;
    setImporting(true);
    setMsg('Import en cours…');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.backup.restore(data);
      await refresh();
      setMsg('✅ Import réussi !');
    } catch { setMsg('❌ Fichier invalide'); }
    finally { setImporting(false); setTimeout(() => setMsg(''), 5000); }
  }

  async function handleReset() {
    if (!confirm('⚠️ SUPPRIMER TOUTES les données ? Irréversible.')) return;
    await api.backup.restore({ data: { articles:[], spools:[], spoolHistory:[], products:[], history:[] } });
    await refresh();
    setMsg('✅ Données supprimées');
    setTimeout(() => setMsg(''), 4000);
  }

  const exampleCost = (2 * (form.printerWatts / 1000) * form.kWhPrice);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {msg && (
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background:msg.startsWith('✅')?'rgba(0,255,136,0.1)':'rgba(255,45,85,0.1)', border:`1px solid ${msg.startsWith('✅')?'rgba(0,255,136,0.3)':'rgba(255,45,85,0.3)'}`, color:msg.startsWith('✅')?'#00FF88':'#FF2D55' }}>
          {msg}
        </motion.div>
      )}

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5"><Settings2 size={16} style={{ color:'#00D9FF' }} /><span className="text-sm font-bold text-white">Paramètres de l'atelier</span></div>
        <div><label className="label">Nom de l'atelier</label><input className="input-field" value={form.workshopName} onChange={e => setField('workshopName',e.target.value)} /></div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5"><Zap size={16} style={{ color:'#F59E0B' }} /><span className="text-sm font-bold text-white">Coût de l'électricité</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prix du kWh (€)</label>
            <input className="input-field" type="number" step="0.001" min="0" value={form.kWhPrice||''} onChange={e => setField('kWhPrice',parseFloat(e.target.value)||0)} />
            <p className="text-xs text-slate-500 mt-1">Tarif EDF ≈ 0,18 €/kWh</p>
          </div>
          <div>
            <label className="label">Consommation imprimante (W)</label>
            <input className="input-field" type="number" step="10" min="0" value={form.printerWatts||''} onChange={e => setField('printerWatts',parseFloat(e.target.value)||0)} />
            <p className="text-xs text-slate-500 mt-1">FDM classique ≈ 100-200W</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
          <Zap size={14} style={{ color:'#F59E0B' }} />
          <span className="text-xs text-slate-400">Pour 2h d'impression :</span>
          <span className="text-sm font-bold ml-auto" style={{ color:'#F59E0B' }}>{fmt(exampleCost,4)} €</span>
        </div>
        <motion.button className="btn-primary mt-4 flex items-center gap-2" onClick={handleSave} whileTap={{ scale:0.97 }}>
          {saved ? <CheckCircle size={15} /> : <Settings2 size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
        </motion.button>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4"><Download size={16} style={{ color:'#8B5CF6' }} /><span className="text-sm font-bold text-white">Sauvegarde</span></div>
        <p className="text-xs text-slate-400 mb-4">Données stockées sur votre TrueNAS (SQLite). Exportez en JSON pour un backup externe.</p>
        <motion.button className="btn-primary flex items-center gap-2 w-full justify-center" onClick={handleExport} disabled={exporting} whileTap={{ scale:0.97 }}>
          <Download size={15} />{exporting ? 'Export en cours…' : 'Exporter le backup JSON'}
        </motion.button>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4"><Upload size={16} style={{ color:'#00FF88' }} /><span className="text-sm font-bold text-white">Restaurer un backup</span></div>
        <p className="text-xs text-slate-400 mb-4"><strong style={{ color:'#FF8C00' }}>Attention : remplace toutes les données.</strong></p>
        <label className="btn-secondary flex items-center gap-2 w-full justify-center cursor-pointer">
          <Upload size={15} />{importing ? 'Import en cours…' : 'Choisir un fichier (.json)'}
          <input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
        </label>
      </div>

      <div className="glass-card p-5" style={{ borderColor:'rgba(255,45,85,0.2)' }}>
        <div className="flex items-center gap-2 mb-3"><Trash2 size={16} style={{ color:'#FF2D55' }} /><span className="text-sm font-bold" style={{ color:'#FF2D55' }}>Zone dangereuse</span></div>
        <p className="text-xs text-slate-400 mb-4">Supprime définitivement toutes les données du serveur.</p>
        <button className="btn-danger w-full" onClick={handleReset}>Supprimer toutes les données</button>
      </div>
    </div>
  );
}
