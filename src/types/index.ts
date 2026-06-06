// ─── Stock articles ───────────────────────────────────────────────────────────

export type Category =
  | 'Filaments 3D'
  | 'Électronique'
  | 'Éclairage'
  | 'Visserie'
  | 'Consommables'
  | 'Emballage'
  | 'Autres';

export type Unit =
  | 'kg' | 'g' | 'm' | 'cm' | 'mm'
  | 'unité' | 'lot' | 'paire' | 'rouleau' | 'ml' | 'L';

export interface Article {
  id?: number;
  name: string;
  category: Category;
  supplier: string;
  purchasePrice: number;
  purchaseQuantity: number;
  unit: Unit;
  unitPrice: number;
  supplierRef?: string;
  stockRemaining: number;
  alertThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Filament spools ──────────────────────────────────────────────────────────

export type MaterialType =
  | 'PLA' | 'PLA+' | 'PETG' | 'ABS' | 'ASA' | 'TPU'
  | 'PA' | 'PA-CF' | 'PLA-CF' | 'PETG-CF' | 'SILK' | 'WOOD' | 'GLOW' | 'Autre';

export const MATERIALS: MaterialType[] = [
  'PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU',
  'PA', 'PA-CF', 'PLA-CF', 'PETG-CF', 'SILK', 'WOOD', 'GLOW', 'Autre',
];

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  'PLA':     '#00D9FF',
  'PLA+':    '#00BFFF',
  'PETG':    '#8B5CF6',
  'ABS':     '#FF8C00',
  'ASA':     '#F59E0B',
  'TPU':     '#00FF88',
  'PA':      '#64748b',
  'PA-CF':   '#475569',
  'PLA-CF':  '#334155',
  'PETG-CF': '#6D28D9',
  'SILK':    '#EC4899',
  'WOOD':    '#92400E',
  'GLOW':    '#84CC16',
  'Autre':   '#94a3b8',
};

export const SPOOL_PRESET_COLORS = [
  { name: 'Blanc',       hex: '#FFFFFF' },
  { name: 'Noir',        hex: '#1a1a1a' },
  { name: 'Gris',        hex: '#808080' },
  { name: 'Rouge',       hex: '#E53E3E' },
  { name: 'Orange',      hex: '#ED8936' },
  { name: 'Jaune',       hex: '#ECC94B' },
  { name: 'Vert',        hex: '#48BB78' },
  { name: 'Bleu',        hex: '#4299E1' },
  { name: 'Violet',      hex: '#9F7AEA' },
  { name: 'Rose',        hex: '#ED64A6' },
  { name: 'Marron',      hex: '#C05621' },
  { name: 'Transparent', hex: '#E2E8F020' },
];

export interface FilamentSpool {
  id?: number;
  brand: string;
  material: MaterialType;
  color: string;
  colorHex: string;
  diameter: 1.75 | 2.85;
  initialWeight: number;
  currentWeight: number;
  quantity: number;        // nombre de bobines identiques en stock
  price: number;
  supplier: string;
  location: string;
  printTempMin: number;
  printTempMax: number;
  bedTempMin: number;
  bedTempMax: number;
  notes: string;
  dateAdded: Date;
}

export interface SpoolPrintHistory {
  id?: number;
  spoolId: number;
  projectName: string;
  printerName: string;
  weightUsed: number;
  durationMinutes: number;
  date: Date;
  notes: string;
  brand: string;
  material: string;
  color: string;
  colorHex: string;
}

export interface FilamentTemplate {
  id?: number;
  brand: string;
  material: MaterialType;
  printTempMin: number;
  printTempMax: number;
  bedTempMin: number;
  bedTempMax: number;
  isPreloaded: boolean;
}

// ─── Products & manufacturing ─────────────────────────────────────────────────

export interface ProductComponent {
  articleId: number;
  articleName: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  totalCost: number;
}

export interface FilamentComponent {
  spoolId: number;
  spoolLabel: string;
  weightGrams: number;
  pricePerGram: number;
  totalCost: number;
  colorHex: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  components: ProductComponent[];
  filamentComponents: FilamentComponent[];
  printTimeMinutes?: number;
  assemblyTimeMinutes?: number;
  laborCostPerHour: number;
  fixedCosts: number;
  marginPercent: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  suggestedPrice: number;
  grossProfit: number;
  createdAt: Date;
}

export interface ProductionRecord {
  id?: number;
  productId?: number;
  productName: string;
  date: Date;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  suggestedPrice: number;
  grossProfit: number;
  marginPercent: number;
  components: ProductComponent[];
  filamentComponents: FilamentComponent[];
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type Page = 'dashboard' | 'filaments' | 'stock' | 'products' | 'history';
