import Dexie, { type Table } from 'dexie';
import type {
  Article, Product, ProductionRecord,
  FilamentSpool, SpoolPrintHistory, FilamentTemplate,
} from '../types';

export class AppDatabase extends Dexie {
  articles!: Table<Article, number>;
  products!: Table<Product, number>;
  productionHistory!: Table<ProductionRecord, number>;
  filamentSpools!: Table<FilamentSpool, number>;
  spoolPrintHistory!: Table<SpoolPrintHistory, number>;
  filamentTemplates!: Table<FilamentTemplate, number>;

  constructor() {
    super('Fila2ProDB');
    this.version(3).stores({
      articles: '++id, name, category, supplier, createdAt',
      products: '++id, name, createdAt',
      productionHistory: '++id, productName, date',
      filamentSpools: '++id, brand, material, dateAdded',
      spoolPrintHistory: '++id, spoolId, date',
      filamentTemplates: '++id, brand, material',
    });
  }
}

export const db = new AppDatabase();

export async function seedDemoData() {
  const articleCount = await db.articles.count();
  if (articleCount === 0) {
    const now = new Date();
    await db.articles.bulkAdd([
      { name: 'Bande LED RGB', category: 'Éclairage', supplier: 'AliExpress', purchasePrice: 15, purchaseQuantity: 500, unit: 'cm', unitPrice: 0.03, stockRemaining: 500, alertThreshold: 50, createdAt: now, updatedAt: now },
      { name: 'Contrôleur RGB', category: 'Électronique', supplier: 'AliExpress', purchasePrice: 4.5, purchaseQuantity: 1, unit: 'unité', unitPrice: 4.5, stockRemaining: 10, alertThreshold: 2, createdAt: now, updatedAt: now },
      { name: 'Alimentation USB 5V', category: 'Électronique', supplier: 'Amazon', purchasePrice: 6.5, purchaseQuantity: 1, unit: 'unité', unitPrice: 6.5, stockRemaining: 8, alertThreshold: 2, createdAt: now, updatedAt: now },
      { name: 'Vis M3x10', category: 'Visserie', supplier: 'BricoDepot', purchasePrice: 5, purchaseQuantity: 100, unit: 'unité', unitPrice: 0.05, stockRemaining: 100, alertThreshold: 20, createdAt: now, updatedAt: now },
      { name: 'Aimant 10x3mm', category: 'Autres', supplier: 'SuperMagnete', purchasePrice: 8, purchaseQuantity: 50, unit: 'unité', unitPrice: 0.16, stockRemaining: 50, alertThreshold: 10, createdAt: now, updatedAt: now },
      { name: 'Boîte carton cadeau', category: 'Emballage', supplier: 'Raja', purchasePrice: 18, purchaseQuantity: 20, unit: 'unité', unitPrice: 0.9, stockRemaining: 20, alertThreshold: 5, createdAt: now, updatedAt: now },
      { name: 'Câble USB-C 1m', category: 'Électronique', supplier: 'Amazon', purchasePrice: 3.5, purchaseQuantity: 1, unit: 'unité', unitPrice: 3.5, stockRemaining: 15, alertThreshold: 3, createdAt: now, updatedAt: now },
      { name: 'Colle cyanoacrylate', category: 'Consommables', supplier: 'Castorama', purchasePrice: 4, purchaseQuantity: 20, unit: 'ml', unitPrice: 0.2, stockRemaining: 20, alertThreshold: 5, createdAt: now, updatedAt: now },
    ]);
  }

  const spoolCount = await db.filamentSpools.count();
  if (spoolCount === 0) {
    const now = new Date();
    await db.filamentSpools.bulkAdd([
      { brand: 'Bambu Lab', material: 'PLA', color: 'Noir', colorHex: '#1a1a1a', diameter: 1.75, initialWeight: 1000, currentWeight: 750, quantity: 2, price: 22, supplier: 'Bambu Lab', location: 'Étagère A1', printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60, notes: '', dateAdded: now },
      { brand: 'Bambu Lab', material: 'PLA', color: 'Blanc', colorHex: '#FFFFFF', diameter: 1.75, initialWeight: 1000, currentWeight: 920, quantity: 1, price: 22, supplier: 'Bambu Lab', location: 'Étagère A2', printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60, notes: '', dateAdded: now },
      { brand: 'eSUN', material: 'PETG', color: 'Transparent', colorHex: '#E2E8F020', diameter: 1.75, initialWeight: 1000, currentWeight: 340, quantity: 1, price: 19.9, supplier: 'Amazon', location: 'Étagère B1', printTempMin: 230, printTempMax: 250, bedTempMin: 70, bedTempMax: 85, notes: 'Sécher avant impression', dateAdded: now },
      { brand: 'Polymaker', material: 'ABS', color: 'Rouge', colorHex: '#E53E3E', diameter: 1.75, initialWeight: 1000, currentWeight: 180, quantity: 1, price: 21, supplier: 'Polymaker', location: 'Étagère B2', printTempMin: 230, printTempMax: 260, bedTempMin: 90, bedTempMax: 110, notes: 'Boîte fermée requise', dateAdded: now },
      { brand: 'SainSmart', material: 'TPU', color: 'Noir', colorHex: '#1a1a1a', diameter: 1.75, initialWeight: 500, currentWeight: 500, quantity: 3, price: 18, supplier: 'Amazon', location: 'Étagère C1', printTempMin: 220, printTempMax: 240, bedTempMin: 30, bedTempMax: 60, notes: '', dateAdded: now },
      { brand: 'Bambu Lab', material: 'SILK', color: 'Or', colorHex: '#FFD700', diameter: 1.75, initialWeight: 1000, currentWeight: 680, quantity: 1, price: 26, supplier: 'Bambu Lab', location: 'Étagère A3', printTempMin: 195, printTempMax: 230, bedTempMin: 35, bedTempMax: 60, notes: '', dateAdded: now },
    ]);
  }

  const templateCount = await db.filamentTemplates.count();
  if (templateCount === 0) {
    await db.filamentTemplates.bulkAdd([
      { brand: 'Bambu Lab', material: 'PLA',  printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Bambu Lab', material: 'PETG', printTempMin: 230, printTempMax: 250, bedTempMin: 70, bedTempMax: 85,  isPreloaded: true },
      { brand: 'Bambu Lab', material: 'ABS',  printTempMin: 230, printTempMax: 260, bedTempMin: 90, bedTempMax: 110, isPreloaded: true },
      { brand: 'eSUN',      material: 'PLA+', printTempMin: 200, printTempMax: 230, bedTempMin: 50, bedTempMax: 65,  isPreloaded: true },
      { brand: 'eSUN',      material: 'PETG', printTempMin: 230, printTempMax: 250, bedTempMin: 70, bedTempMax: 85,  isPreloaded: true },
      { brand: 'eSUN',      material: 'ABS',  printTempMin: 230, printTempMax: 260, bedTempMin: 90, bedTempMax: 110, isPreloaded: true },
      { brand: 'Polymaker', material: 'PLA',  printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Polymaker', material: 'ABS',  printTempMin: 230, printTempMax: 260, bedTempMin: 90, bedTempMax: 110, isPreloaded: true },
      { brand: 'SainSmart', material: 'TPU',  printTempMin: 220, printTempMax: 240, bedTempMin: 30, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Hatchbox',  material: 'PLA',  printTempMin: 185, printTempMax: 215, bedTempMin: 35, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Prusament', material: 'PETG', printTempMin: 230, printTempMax: 250, bedTempMin: 70, bedTempMax: 90,  isPreloaded: true },
      { brand: 'Prusament', material: 'PLA',  printTempMin: 210, printTempMax: 230, bedTempMin: 55, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Generic',   material: 'PLA',  printTempMin: 190, printTempMax: 220, bedTempMin: 35, bedTempMax: 60,  isPreloaded: true },
      { brand: 'Generic',   material: 'PETG', printTempMin: 230, printTempMax: 250, bedTempMin: 70, bedTempMax: 85,  isPreloaded: true },
    ]);
  }
}
