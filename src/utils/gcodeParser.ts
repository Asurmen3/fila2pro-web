export interface GcodeData {
  filamentGrams?: number;
  printTimeMinutes?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  slicerName?: string;
}

function parseTime(raw: string): number | undefined {
  raw = raw.trim();

  // Format "2h 14m 32s" ou "2h 14m" ou "14m 32s"
  const hms = raw.match(/(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const h = parseInt(hms[1] ?? '0');
    const m = parseInt(hms[2] ?? '0');
    const s = parseInt(hms[3] ?? '0');
    return h * 60 + m + Math.round(s / 60);
  }

  // Format "02:14:32"
  const colon = raw.match(/^(\d+):(\d+):(\d+)$/);
  if (colon) {
    return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  }

  // Format secondes brutes (Cura: TIME:8432)
  const secs = raw.match(/^(\d+)$/);
  if (secs) {
    return Math.round(parseInt(secs[1]) / 60);
  }

  return undefined;
}

export function parseGcode(content: string): GcodeData {
  const result: GcodeData = {};
  const lines = content.split('\n').slice(0, 150); // On ne lit que l'en-tête

  for (const line of lines) {
    const l = line.trim();

    // Détection du slicer
    if (!result.slicerName) {
      if (l.includes('Anycubic')) result.slicerName = 'Anycubic Slicer';
      else if (l.includes('PrusaSlicer')) result.slicerName = 'PrusaSlicer';
      else if (l.includes('OrcaSlicer')) result.slicerName = 'OrcaSlicer';
      else if (l.includes('BambuStudio')) result.slicerName = 'Bambu Studio';
      else if (l.includes('Cura')) result.slicerName = 'Cura';
    }

    // Poids filament — PrusaSlicer / Anycubic / OrcaSlicer / Bambu
    // ; filament used [g] = 45.23
    let m = l.match(/filament used \[g\]\s*=\s*([\d.]+)/i);
    if (m && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]);
      continue;
    }

    // ; total filament used [g] = 45.23
    m = l.match(/total filament used \[g\]\s*=\s*([\d.]+)/i);
    if (m && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]);
      continue;
    }

    // Cura: ;Filament used: 4.52m → on ignore (en mètres, pas grammes)
    // Cura avec masse: ;Filament weight = 12.34g
    m = l.match(/filament weight\s*=\s*([\d.]+)\s*g/i);
    if (m && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]);
      continue;
    }

    // Temps d'impression — PrusaSlicer / Anycubic
    // ; estimated printing time (normal mode) = 2h 14m 32s
    m = l.match(/estimated printing time.*?=\s*(.+)/i);
    if (m && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]);
      continue;
    }

    // Bambu Studio: ; estimated_printing_time_normal_mode = 02:14:32
    m = l.match(/estimated_printing_time_normal_mode\s*=\s*(.+)/i);
    if (m && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]);
      continue;
    }

    // Cura: ;TIME:8432
    m = l.match(/^;TIME:(\d+)/i);
    if (m && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]);
      continue;
    }

    // Température buse — PrusaSlicer / Anycubic
    // ; nozzle_temperature = 210
    m = l.match(/nozzle_temperature\s*=\s*(\d+)/i);
    if (m && !result.nozzleTemp) {
      result.nozzleTemp = parseInt(m[1]);
      continue;
    }

    // Cura: ;EXTRUDER_TRAIN.0.INITIAL_TEMPERATURE:210
    m = l.match(/INITIAL_TEMPERATURE:(\d+)/i);
    if (m && !result.nozzleTemp) {
      result.nozzleTemp = parseInt(m[1]);
      continue;
    }

    // Température plateau
    // ; bed_temperature = 60
    m = l.match(/bed_temperature\s*=\s*(\d+)/i);
    if (m && !result.bedTemp) {
      result.bedTemp = parseInt(m[1]);
      continue;
    }

    // Cura: ;BUILD_PLATE.INITIAL_TEMPERATURE:60
    m = l.match(/BUILD_PLATE.*TEMPERATURE:(\d+)/i);
    if (m && !result.bedTemp) {
      result.bedTemp = parseInt(m[1]);
      continue;
    }
  }

  return result;
}

export function readGcodeFile(file: File): Promise<GcodeData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      resolve(parseGcode(content));
    };
    reader.onerror = reject;
    // On lit seulement les 20 premiers ko (l'en-tête suffit)
    reader.readAsText(file.slice(0, 20480));
  });
}
