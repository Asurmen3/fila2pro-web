const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'fila2pro.db');

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../dist')));

// ── Database setup ────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  supplier TEXT DEFAULT '',
  purchasePrice REAL DEFAULT 0,
  purchaseQuantity REAL DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unitPrice REAL DEFAULT 0,
  supplierRef TEXT DEFAULT '',
  stockRemaining REAL DEFAULT 0,
  alertThreshold REAL DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS filament_spools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  material TEXT DEFAULT 'PLA',
  color TEXT DEFAULT '',
  colorHex TEXT DEFAULT '#FFFFFF',
  diameter REAL DEFAULT 1.75,
  initialWeight REAL DEFAULT 1000,
  currentWeight REAL DEFAULT 1000,
  quantity INTEGER DEFAULT 1,
  price REAL DEFAULT 0,
  supplier TEXT DEFAULT '',
  location TEXT DEFAULT '',
  printTempMin INTEGER DEFAULT 190,
  printTempMax INTEGER DEFAULT 220,
  bedTempMin INTEGER DEFAULT 35,
  bedTempMax INTEGER DEFAULT 60,
  notes TEXT DEFAULT '',
  dateAdded TEXT
);

CREATE TABLE IF NOT EXISTS spool_print_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spoolId INTEGER NOT NULL,
  projectName TEXT DEFAULT '',
  printerName TEXT DEFAULT '',
  weightUsed REAL DEFAULT 0,
  durationMinutes INTEGER DEFAULT 0,
  date TEXT,
  notes TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  material TEXT DEFAULT '',
  color TEXT DEFAULT '',
  colorHex TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  components TEXT DEFAULT '[]',
  filamentComponents TEXT DEFAULT '[]',
  printTimeMinutes INTEGER DEFAULT 0,
  assemblyTimeMinutes INTEGER DEFAULT 0,
  laborCostPerHour REAL DEFAULT 15,
  fixedCosts REAL DEFAULT 0,
  marginPercent REAL DEFAULT 40,
  materialCost REAL DEFAULT 0,
  laborCost REAL DEFAULT 0,
  totalCost REAL DEFAULT 0,
  suggestedPrice REAL DEFAULT 0,
  grossProfit REAL DEFAULT 0,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS production_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER,
  productName TEXT,
  date TEXT,
  materialCost REAL DEFAULT 0,
  laborCost REAL DEFAULT 0,
  totalCost REAL DEFAULT 0,
  suggestedPrice REAL DEFAULT 0,
  grossProfit REAL DEFAULT 0,
  marginPercent REAL DEFAULT 0,
  components TEXT DEFAULT '[]',
  filamentComponents TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS filament_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT,
  material TEXT,
  printTempMin INTEGER,
  printTempMax INTEGER,
  bedTempMin INTEGER,
  bedTempMax INTEGER,
  isPreloaded INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// ── Seed data ─────────────────────────────────────────────────────────────────
function seed() {
  const now = new Date().toISOString();

  if (db.prepare('SELECT COUNT(*) as c FROM articles').get().c === 0) {
    const ins = db.prepare(`INSERT INTO articles (name,category,supplier,purchasePrice,purchaseQuantity,unit,unitPrice,stockRemaining,alertThreshold,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    [
      ['Bande LED RGB','Éclairage','AliExpress',15,500,'cm',0.03,500,50],
      ['Contrôleur RGB','Électronique','AliExpress',4.5,1,'unité',4.5,10,2],
      ['Alimentation USB 5V','Électronique','Amazon',6.5,1,'unité',6.5,8,2],
      ['Vis M3x10','Visserie','BricoDepot',5,100,'unité',0.05,100,20],
      ['Aimant 10x3mm','Autres','SuperMagnete',8,50,'unité',0.16,50,10],
      ['Boîte carton cadeau','Emballage','Raja',18,20,'unité',0.9,20,5],
      ['Câble USB-C 1m','Électronique','Amazon',3.5,1,'unité',3.5,15,3],
      ['Colle cyanoacrylate','Consommables','Castorama',4,20,'ml',0.2,20,5],
    ].forEach(r => ins.run(...r, now, now));
  }

  if (db.prepare('SELECT COUNT(*) as c FROM filament_spools').get().c === 0) {
    const ins = db.prepare(`INSERT INTO filament_spools (brand,material,color,colorHex,diameter,initialWeight,currentWeight,quantity,price,supplier,location,printTempMin,printTempMax,bedTempMin,bedTempMax,notes,dateAdded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    [
      ['Bambu Lab','PLA','Noir','#1a1a1a',1.75,1000,750,2,22,'Bambu Lab','Étagère A1',190,220,35,60,''],
      ['Bambu Lab','PLA','Blanc','#FFFFFF',1.75,1000,920,1,22,'Bambu Lab','Étagère A2',190,220,35,60,''],
      ['eSUN','PETG','Transparent','#E2E8F020',1.75,1000,340,1,19.9,'Amazon','Étagère B1',230,250,70,85,'Sécher avant impression'],
      ['Polymaker','ABS','Rouge','#E53E3E',1.75,1000,180,1,21,'Polymaker','Étagère B2',230,260,90,110,'Boîte fermée requise'],
      ['SainSmart','TPU','Noir','#1a1a1a',1.75,500,500,3,18,'Amazon','Étagère C1',220,240,30,60,''],
      ['Bambu Lab','SILK','Or','#FFD700',1.75,1000,680,1,26,'Bambu Lab','Étagère A3',195,230,35,60,''],
    ].forEach(r => ins.run(...r, now));
  }

  {
    // Idempotent : ajoute les modèles manquants (par marque+matériau) à chaque démarrage
    const exists = db.prepare('SELECT 1 FROM filament_templates WHERE brand=? AND material=?');
    const ins = db.prepare(`INSERT INTO filament_templates (brand,material,printTempMin,printTempMax,bedTempMin,bedTempMax,isPreloaded) VALUES (?,?,?,?,?,?,1)`);
    [
      ['Anycubic','PLA',190,220,50,60],
      ['Anycubic','PLA+',200,230,55,65],
      ['Anycubic','PETG',230,250,70,80],
      ['Anycubic','ABS',230,270,90,100],
      ['Anycubic','ASA',240,260,90,100],
      ['Anycubic','TPU',210,230,40,60],
      ['Anycubic','SILK',200,230,50,60],
      ['Anycubic','PLA-CF',210,230,55,65],
      ['Anycubic','PETG-CF',240,260,70,80],
      ['Bambu Lab','PLA',190,220,35,60],
      ['Bambu Lab','PETG',230,250,70,85],
      ['Bambu Lab','ABS',230,260,90,110],
      ['eSUN','PLA+',200,230,50,65],
      ['eSUN','PETG',230,250,70,85],
      ['Polymaker','PLA',190,220,35,60],
      ['Polymaker','ABS',230,260,90,110],
      ['SainSmart','TPU',220,240,30,60],
      ['Prusament','PLA',210,230,55,60],
      ['Prusament','PETG',230,250,70,90],
      ['Generic','PLA',190,220,35,60],
      ['Generic','PETG',230,250,70,85],
    ].forEach(r => { if (!exists.get(r[0], r[1])) ins.run(...r); });
  }
}
seed();

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseJSON(val, fallback = []) {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

// ── ARTICLES ──────────────────────────────────────────────────────────────────
app.get('/api/articles', (_, res) => {
  res.json(db.prepare('SELECT * FROM articles ORDER BY name').all());
});

app.post('/api/articles', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO articles (name,category,supplier,purchasePrice,purchaseQuantity,unit,unitPrice,supplierRef,stockRemaining,alertThreshold,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(d.name,d.category,d.supplier,d.purchasePrice,d.purchaseQuantity,d.unit,d.unitPrice,d.supplierRef||'',d.purchaseQuantity,d.alertThreshold||0,now,now);
  res.json(db.prepare('SELECT * FROM articles WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/articles/:id', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE articles SET name=?,category=?,supplier=?,purchasePrice=?,purchaseQuantity=?,unit=?,unitPrice=?,supplierRef=?,stockRemaining=?,alertThreshold=?,updatedAt=? WHERE id=?`
  ).run(d.name,d.category,d.supplier,d.purchasePrice,d.purchaseQuantity,d.unit,d.unitPrice,d.supplierRef||'',d.stockRemaining,d.alertThreshold||0,now,req.params.id);
  res.json(db.prepare('SELECT * FROM articles WHERE id=?').get(req.params.id));
});

app.delete('/api/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── FILAMENT SPOOLS ───────────────────────────────────────────────────────────
app.get('/api/spools', (_, res) => {
  res.json(db.prepare('SELECT * FROM filament_spools ORDER BY brand').all());
});

app.post('/api/spools', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO filament_spools (brand,material,color,colorHex,diameter,initialWeight,currentWeight,quantity,price,supplier,location,printTempMin,printTempMax,bedTempMin,bedTempMax,notes,dateAdded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(d.brand,d.material,d.color,d.colorHex,d.diameter,d.initialWeight,d.currentWeight,d.quantity||1,d.price,d.supplier,d.location,d.printTempMin,d.printTempMax,d.bedTempMin,d.bedTempMax,d.notes,now);
  res.json(db.prepare('SELECT * FROM filament_spools WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/spools/:id', (req, res) => {
  const d = req.body;
  db.prepare(`UPDATE filament_spools SET brand=?,material=?,color=?,colorHex=?,diameter=?,initialWeight=?,currentWeight=?,quantity=?,price=?,supplier=?,location=?,printTempMin=?,printTempMax=?,bedTempMin=?,bedTempMax=?,notes=? WHERE id=?`
  ).run(d.brand,d.material,d.color,d.colorHex,d.diameter,d.initialWeight,d.currentWeight,d.quantity??1,d.price,d.supplier,d.location,d.printTempMin,d.printTempMax,d.bedTempMin,d.bedTempMax,d.notes,req.params.id);
  res.json(db.prepare('SELECT * FROM filament_spools WHERE id=?').get(req.params.id));
});

app.delete('/api/spools/:id', (req, res) => {
  db.prepare('DELETE FROM filament_spools WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM spool_print_history WHERE spoolId=?').run(req.params.id);
  res.json({ ok: true });
});

// ── SPOOL PRINT HISTORY ───────────────────────────────────────────────────────
app.get('/api/spools/:id/history', (req, res) => {
  res.json(db.prepare('SELECT * FROM spool_print_history WHERE spoolId=? ORDER BY date DESC').all(req.params.id));
});

app.post('/api/spools/:id/history', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO spool_print_history (spoolId,projectName,printerName,weightUsed,durationMinutes,date,notes,brand,material,color,colorHex) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(req.params.id,d.projectName,d.printerName,d.weightUsed,d.durationMinutes||0,d.date||now,d.notes||'',d.brand,d.material,d.color,d.colorHex||'');
  res.json(db.prepare('SELECT * FROM spool_print_history WHERE id=?').get(r.lastInsertRowid));
});

app.delete('/api/spools/history/:id', (req, res) => {
  const h = db.prepare('SELECT * FROM spool_print_history WHERE id=?').get(req.params.id);
  if (h) {
    db.prepare('UPDATE filament_spools SET currentWeight=currentWeight+? WHERE id=?').run(h.weightUsed, h.spoolId);
    db.prepare('DELETE FROM spool_print_history WHERE id=?').run(req.params.id);
  }
  res.json({ ok: true });
});

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
app.get('/api/templates', (_, res) => {
  res.json(db.prepare('SELECT * FROM filament_templates ORDER BY brand,material').all());
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
app.get('/api/products', (_, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
  res.json(rows.map(r => ({ ...r, components: parseJSON(r.components), filamentComponents: parseJSON(r.filamentComponents) })));
});

app.post('/api/products', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO products (name,description,components,filamentComponents,printTimeMinutes,assemblyTimeMinutes,laborCostPerHour,fixedCosts,marginPercent,materialCost,laborCost,totalCost,suggestedPrice,grossProfit,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(d.name,d.description||'',JSON.stringify(d.components||[]),JSON.stringify(d.filamentComponents||[]),d.printTimeMinutes||0,d.assemblyTimeMinutes||0,d.laborCostPerHour,d.fixedCosts,d.marginPercent,d.materialCost,d.laborCost,d.totalCost,d.suggestedPrice,d.grossProfit,now);
  const row = db.prepare('SELECT * FROM products WHERE id=?').get(r.lastInsertRowid);
  res.json({ ...row, components: parseJSON(row.components), filamentComponents: parseJSON(row.filamentComponents) });
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── PRODUCTION HISTORY ────────────────────────────────────────────────────────
app.get('/api/history', (_, res) => {
  const rows = db.prepare('SELECT * FROM production_history ORDER BY date DESC').all();
  res.json(rows.map(r => ({ ...r, components: parseJSON(r.components), filamentComponents: parseJSON(r.filamentComponents) })));
});

app.post('/api/history', (req, res) => {
  const d = req.body;
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO production_history (productId,productName,date,materialCost,laborCost,totalCost,suggestedPrice,grossProfit,marginPercent,components,filamentComponents) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(d.productId||null,d.productName,d.date||now,d.materialCost,d.laborCost,d.totalCost,d.suggestedPrice,d.grossProfit,d.marginPercent,JSON.stringify(d.components||[]),JSON.stringify(d.filamentComponents||[]));
  const row = db.prepare('SELECT * FROM production_history WHERE id=?').get(r.lastInsertRowid);
  res.json({ ...row, components: parseJSON(row.components), filamentComponents: parseJSON(row.filamentComponents) });
});

app.delete('/api/history/:id', (req, res) => {
  db.prepare('DELETE FROM production_history WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (_, res) => {
  const rows = db.prepare('SELECT key,value FROM app_settings').all();
  const s = { kWhPrice: 0.18, printerWatts: 150, workshopName: 'Mon atelier' };
  rows.forEach(r => { try { s[r.key] = JSON.parse(r.value); } catch {} });
  res.json(s);
});

app.put('/api/settings', (req, res) => {
  const ins = db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)');
  Object.entries(req.body).forEach(([k, v]) => ins.run(k, JSON.stringify(v)));
  res.json({ ok: true });
});

// ── BACKUP & RESTORE ──────────────────────────────────────────────────────────
app.get('/api/backup', (_, res) => {
  const articles = db.prepare('SELECT * FROM articles').all();
  const spools = db.prepare('SELECT * FROM filament_spools').all();
  const spoolHistory = db.prepare('SELECT * FROM spool_print_history').all();
  const productsRaw = db.prepare('SELECT * FROM products').all();
  const historyRaw = db.prepare('SELECT * FROM production_history').all();
  const templates = db.prepare('SELECT * FROM filament_templates').all();
  const settingsRows = db.prepare('SELECT key,value FROM app_settings').all();
  const settings = {};
  settingsRows.forEach(r => { try { settings[r.key] = JSON.parse(r.value); } catch {} });

  res.json({
    version: 2,
    exportedAt: new Date().toISOString(),
    settings,
    data: {
      articles,
      spools,
      spoolHistory,
      products: productsRaw.map(r => ({ ...r, components: parseJSON(r.components), filamentComponents: parseJSON(r.filamentComponents) })),
      history: historyRaw.map(r => ({ ...r, components: parseJSON(r.components), filamentComponents: parseJSON(r.filamentComponents) })),
      templates,
    },
  });
});

app.post('/api/restore', (req, res) => {
  const { data, settings } = req.body;
  const restore = db.transaction(() => {
    db.prepare('DELETE FROM articles').run();
    db.prepare('DELETE FROM filament_spools').run();
    db.prepare('DELETE FROM spool_print_history').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM production_history').run();

    const now = new Date().toISOString();
    (data.articles || []).forEach(a => db.prepare(`INSERT INTO articles (name,category,supplier,purchasePrice,purchaseQuantity,unit,unitPrice,supplierRef,stockRemaining,alertThreshold,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(a.name,a.category,a.supplier,a.purchasePrice,a.purchaseQuantity,a.unit,a.unitPrice,a.supplierRef||'',a.stockRemaining,a.alertThreshold||0,a.createdAt||now,a.updatedAt||now));
    (data.spools || []).forEach(s => db.prepare(`INSERT INTO filament_spools (brand,material,color,colorHex,diameter,initialWeight,currentWeight,quantity,price,supplier,location,printTempMin,printTempMax,bedTempMin,bedTempMax,notes,dateAdded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(s.brand,s.material,s.color,s.colorHex,s.diameter,s.initialWeight,s.currentWeight,s.quantity||1,s.price,s.supplier,s.location,s.printTempMin,s.printTempMax,s.bedTempMin,s.bedTempMax,s.notes,s.dateAdded||now));
    (data.spoolHistory || []).forEach(h => db.prepare(`INSERT INTO spool_print_history (spoolId,projectName,printerName,weightUsed,durationMinutes,date,notes,brand,material,color,colorHex) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(h.spoolId,h.projectName,h.printerName,h.weightUsed,h.durationMinutes||0,h.date||now,h.notes||'',h.brand,h.material,h.color,h.colorHex||''));
    (data.products || []).forEach(p => db.prepare(`INSERT INTO products (name,description,components,filamentComponents,printTimeMinutes,assemblyTimeMinutes,laborCostPerHour,fixedCosts,marginPercent,materialCost,laborCost,totalCost,suggestedPrice,grossProfit,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name,p.description||'',JSON.stringify(p.components||[]),JSON.stringify(p.filamentComponents||[]),p.printTimeMinutes||0,p.assemblyTimeMinutes||0,p.laborCostPerHour,p.fixedCosts,p.marginPercent,p.materialCost,p.laborCost,p.totalCost,p.suggestedPrice,p.grossProfit,p.createdAt||now));
    (data.history || []).forEach(h => db.prepare(`INSERT INTO production_history (productId,productName,date,materialCost,laborCost,totalCost,suggestedPrice,grossProfit,marginPercent,components,filamentComponents) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(h.productId||null,h.productName,h.date||now,h.materialCost,h.laborCost,h.totalCost,h.suggestedPrice,h.grossProfit,h.marginPercent,JSON.stringify(h.components||[]),JSON.stringify(h.filamentComponents||[])));

    if (settings) {
      const ins = db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)');
      Object.entries(settings).forEach(([k, v]) => ins.run(k, JSON.stringify(v)));
    }
  });
  restore();
  res.json({ ok: true });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FILA2PRO server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
