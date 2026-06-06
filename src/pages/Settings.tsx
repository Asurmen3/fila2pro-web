import { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../db/database';
import { Download, Upload, Trash2, Zap, Settings2, CheckCircle } from 'lucide-react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/settings';
import type { AppSettings } from '../types';

function fmt(n: number, d = 2) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  function setField<K extends keyof AppSettings>(k: K, v: AppSettings[K]) {
    setSettings(prev => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const [articles, spools, products, history, spoolHistory, templates] = await Promise.all([
        db.articles.toArray(),
        db.filamentSpools.toArray(),
        db.products.toArray(),
        db.productionHistory.toArray(),
        db.spoolPrintHistory.toArray(),
        db.filamentTemplates.toArray(),
      ]);

      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        settings,
        data: { articles, spools, products, history, spoolHistory, templates },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fila2pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('✅ Backup exporté avec succès !');
    } catch (e) {
      setMsg('❌ Erreur lors de l\'export');
    } finally {
      setExporting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport(file: File) {
    if (!confirm('⚠️ L\'import va REMPLACER toutes vos données actuelles. Continuer ?')) return;
    setImporting(true);
    setMsg('Import en cours…');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const { data, settings: importedSettings } = backup;

      await Promise.all([
        db.articles.clear(),
        db.filamentSpools.clear(),
        db.products.clear(),
        db.productionHistory.clear(),
        db.spoolPrintHistory.clear(),
      ]);

      if (data.articles?.length)     await db.articles.bulkAdd(data.articles.map((a: object) => ({ ...a, id: undefined })));
      if (data.spools?.length)       await db.filamentSpools.bulkAdd(data.spools.map((s: object) => ({ ...s, id: undefined })));
      if (data.products?.length)     await db.products.bulkAdd(data.products.map((p: object) => ({ ...p, id: undefined })));
      if (data.history?.length)      await db.productionHistory.bulkAdd(data.history.map((h: object) => ({ ...h, id: undefined })));
      if (data.spoolHistory?.length) await db.spoolPrintHistory.bulkAdd(data.spoolHistory.map((h: object) => ({ ...h, id: undefined })));

      if (importedSettings) {
        saveSettings({ ...DEFAULT_SETTINGS, ...importedSettings });
        setSettings({ ...DEFAULT_SETTINGS, ...importedSettings });
      }

      setMsg(`✅ Import réussi ! ${data.articles?.length ?? 0} articles · ${data.spools?.length ?? 0} bobines · ${data.products?.length ?? 0} produits`);
    } catch (e) {
      setMsg('❌ Fichier invalide ou corrompu');
    } finally {
      setImporting(false);
      setTimeout(() => setMsg(''), 6000);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  async function handleReset() {
    if (!confirm('⚠️ SUPPRIMER TOUTES les données ? Cette action est irréversible.')) return;
    await Promise.all([
      db.articles.clear(), db.filamentSpools.clear(),
      db.products.clear(), db.productionHistory.clear(), db.spoolPrintHistory.clear(),
    ]);
    setMsg('✅ Toutes les données ont été supprimées');
    setTimeout(() => setMsg(''), 4000);
  }

  // Calcul exemple coût électricité
  const exampleCost = calcExample(settings);
  function calcExample(s: AppSettings) {
    return (2 * (s.printerWatts / 1000) * s.kWhPrice); // 2h d'impression
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Message flash */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: msg.startsWith('✅') ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,85,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(0,255,136,0.3)' : 'rgba(255,45,85,0.3)'}`, color: msg.startsWith('✅') ? '#00FF88' : '#FF2D55' }}>
          {msg}
        </motion.div>
      )}

      {/* ── Paramètres atelier ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 size={16} style={{ color: '#00D9FF' }} />
          <span className="text-sm font-bold text-white">Paramètres de l'atelier</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Nom de l'atelier</label>
            <input className="input-field" value={settings.workshopName} onChange={e => setField('workshopName', e.target.value)} placeholder="Mon atelier" />
          </div>
        </div>
      </div>

      {/* ── Coût électricité ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Zap size={16} style={{ color: '#F59E0B' }} />
          <span className="text-sm font-bold text-white">Coût de l'électricité</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prix du kWh (€)</label>
            <input className="input-field" type="number" step="0.001" min="0"
              value={settings.kWhPrice || ''}
              onChange={e => setField('kWhPrice', parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-slate-500 mt-1">Tarif EDF de base ≈ 0,18 €/kWh</p>
          </div>
          <div>
            <label className="label">Consommation imprimante (W)</label>
            <input className="input-field" type="number" step="10" min="0"
              value={settings.printerWatts || ''}
              onChange={e => setField('printerWatts', parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-slate-500 mt-1">FDM classique ≈ 100-200W</p>
          </div>
        </div>

        {/* Aperçu */}
        <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Zap size={14} style={{ color: '#F59E0B' }} />
          <span className="text-xs text-slate-400">Pour 2h d'impression :</span>
          <span className="text-sm font-bold ml-auto" style={{ color: '#F59E0B' }}>{fmt(exampleCost, 4)} €</span>
        </div>

        <motion.button className="btn-primary mt-4 flex items-center gap-2" onClick={handleSave} whileTap={{ scale: 0.97 }}>
          {saved ? <CheckCircle size={15} /> : <Settings2 size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
        </motion.button>
      </div>

      {/* ── Backup ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Download size={16} style={{ color: '#8B5CF6' }} />
          <span className="text-sm font-bold text-white">Sauvegarde des données</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Exportez toutes vos données (bobines, stock, produits, historique) dans un fichier JSON. Conservez ce fichier en lieu sûr — c'est votre seule sauvegarde si vous changez de navigateur.
        </p>
        <motion.button className="btn-primary flex items-center gap-2 w-full justify-center"
          onClick={handleExport} disabled={exporting} whileTap={{ scale: 0.97 }}>
          <Download size={15} />
          {exporting ? 'Export en cours…' : 'Exporter le backup JSON'}
        </motion.button>
      </div>

      {/* ── Restore ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Upload size={16} style={{ color: '#00FF88' }} />
          <span className="text-sm font-bold text-white">Restaurer un backup</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Importez un fichier JSON précédemment exporté. <strong style={{ color: '#FF8C00' }}>Attention : ceci remplace toutes les données actuelles.</strong>
        </p>
        <label className="btn-secondary flex items-center gap-2 w-full justify-center cursor-pointer">
          <Upload size={15} />
          {importing ? 'Import en cours…' : 'Choisir un fichier backup (.json)'}
          <input type="file" accept=".json" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
        </label>
      </div>

      {/* ── Danger zone ── */}
      <div className="glass-card p-5" style={{ borderColor: 'rgba(255,45,85,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={16} style={{ color: '#FF2D55' }} />
          <span className="text-sm font-bold" style={{ color: '#FF2D55' }}>Zone dangereuse</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Supprime définitivement toutes les données. Faites un backup d'abord !</p>
        <button className="btn-danger w-full" onClick={handleReset}>
          Supprimer toutes les données
        </button>
      </div>
    </div>
  );
}
