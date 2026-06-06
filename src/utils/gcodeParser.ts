export interface GcodeData {
  filamentGrams?: number;
  filamentMm?: number;
  printTimeMinutes?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  slicerName?: string;
}

function parseTime(raw: string): number | undefined {
  raw = raw.trim();

  // "2h 14m 32s" / "2h 14m" / "14m 32s" / "1d 2h 3m"
  const dhms = raw.match(/(?:(\d+)\s*d\s*)?(?:(\d+)\s*h\s*)?(?:(\d+)\s*m\s*)?(?:(\d+)\s*s)?/i);
  if (dhms && (dhms[1] || dhms[2] || dhms[3] || dhms[4])) {
    const d = parseInt(dhms[1] ?? '0');
    const h = parseInt(dhms[2] ?? '0');
    const m = parseInt(dhms[3] ?? '0');
    const s = parseInt(dhms[4] ?? '0');
    return d * 1440 + h * 60 + m + Math.round(s / 60);
  }

  // "02:14:32" ou "2:14"
  const colon = raw.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colon) {
    if (colon[3] !== undefined) return parseInt(colon[1]) * 60 + parseInt(colon[2]);
    return parseInt(colon[1]) * 60 + parseInt(colon[2]); // h:m
  }

  // secondes brutes
  const secs = raw.match(/^(\d+(?:\.\d+)?)$/);
  if (secs) return Math.round(parseFloat(secs[1]) / 60);

  return undefined;
}

export function parseGcode(content: string): GcodeData {
  const result: GcodeData = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const l = line.trim();
    if (!l.startsWith(';') && !l.startsWith('M')) continue; // commentaires & commandes M

    // ── Slicer ──
    if (!result.slicerName) {
      if (/anycubic/i.test(l)) result.slicerName = 'Anycubic Slicer';
      else if (/prusaslicer/i.test(l)) result.slicerName = 'PrusaSlicer';
      else if (/orcaslicer/i.test(l)) result.slicerName = 'OrcaSlicer';
      else if (/bambustudio/i.test(l)) result.slicerName = 'Bambu Studio';
      else if (/cura/i.test(l)) result.slicerName = 'Cura';
      else if (/superslicer/i.test(l)) result.slicerName = 'SuperSlicer';
    }

    let m: RegExpMatchArray | null;

    // ── Poids filament (grammes) ──
    // ; filament used [g] = 45.23  /  ; total filament used [g] = 45.23
    if ((m = l.match(/(?:total\s+)?filament\s+used\s*\[g\]\s*=\s*([\d.]+)/i)) && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]); continue;
    }
    // ; filament_weight = 12.34  /  ; filament weight = 12.34g
    if ((m = l.match(/filament[_\s]weight\s*=\s*([\d.]+)/i)) && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]); continue;
    }
    // Bambu / Orca : ; total filament weight [g] : 45.2
    if ((m = l.match(/total\s+filament\s+weight.*?[:=]\s*([\d.]+)/i)) && !result.filamentGrams) {
      result.filamentGrams = parseFloat(m[1]); continue;
    }

    // ── Longueur filament (mm) — fallback pour estimer le poids ──
    // ; filament used [mm] = 12345.6   /   ;Filament used: 4.52m
    if ((m = l.match(/filament\s+used\s*\[mm\]\s*=\s*([\d.]+)/i)) && !result.filamentMm) {
      result.filamentMm = parseFloat(m[1]); continue;
    }
    if ((m = l.match(/;\s*filament\s+used\s*:\s*([\d.]+)\s*m\b/i)) && !result.filamentMm) {
      result.filamentMm = parseFloat(m[1]) * 1000; continue;
    }

    // ── Temps d'impression ──
    // ; estimated printing time (normal mode) = 2h 14m 32s
    if ((m = l.match(/estimated[_\s]printing[_\s]time.*?[:=]\s*(.+)$/i)) && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]); continue;
    }
    // ; model printing time: 2h 14m ; total estimated time: ...
    if ((m = l.match(/(?:model\s+printing\s+time|total\s+estimated\s+time)\s*[:=]\s*(.+)$/i)) && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]); continue;
    }
    // Cura : ;TIME:8432
    if ((m = l.match(/^;TIME:\s*(\d+)/i)) && !result.printTimeMinutes) {
      result.printTimeMinutes = parseTime(m[1]); continue;
    }

    // ── Température buse ──
    if ((m = l.match(/(?:nozzle_temperature|temperature)\s*=\s*(\d+)/i)) && !result.nozzleTemp) {
      result.nozzleTemp = parseInt(m[1]); continue;
    }
    if ((m = l.match(/first_layer_temperature\s*=\s*(\d+)/i)) && !result.nozzleTemp) {
      result.nozzleTemp = parseInt(m[1]); continue;
    }
    if ((m = l.match(/INITIAL_TEMPERATURE:\s*(\d+)/i)) && !result.nozzleTemp) {
      result.nozzleTemp = parseInt(m[1]); continue;
    }

    // ── Température plateau ──
    if ((m = l.match(/(?:bed_temperature|first_layer_bed_temperature)\s*=\s*(\d+)/i)) && !result.bedTemp) {
      result.bedTemp = parseInt(m[1]); continue;
    }
    if ((m = l.match(/BUILD_PLATE.*?TEMPERATURE:\s*(\d+)/i)) && !result.bedTemp) {
      result.bedTemp = parseInt(m[1]); continue;
    }
  }

  // Estimation du poids à partir de la longueur si pas de poids direct
  // PLA 1.75mm : densité 1.24 g/cm³, section π·(0.875mm)² = 2.405 mm²
  if (!result.filamentGrams && result.filamentMm) {
    const volumeCm3 = (result.filamentMm * 2.405) / 1000; // mm³ → cm³
    result.filamentGrams = +(volumeCm3 * 1.24).toFixed(1);
  }

  return result;
}

export async function readGcodeFile(file: File): Promise<GcodeData> {
  // Les slicers type Anycubic/Prusa/Orca écrivent les stats à la FIN du fichier.
  // Cura les écrit au DÉBUT. On lit donc les deux extrémités.
  const HEAD = 64 * 1024;   // 64 Ko début
  const TAIL = 128 * 1024;  // 128 Ko fin

  const head = await file.slice(0, HEAD).text();
  const tail = file.size > HEAD ? await file.slice(Math.max(0, file.size - TAIL)).text() : '';

  // On parse la fin d'abord (stats finales), puis le début complète les trous
  const fromTail = parseGcode(tail);
  const fromHead = parseGcode(head);

  return {
    filamentGrams:    fromTail.filamentGrams    ?? fromHead.filamentGrams,
    filamentMm:       fromTail.filamentMm       ?? fromHead.filamentMm,
    printTimeMinutes: fromTail.printTimeMinutes ?? fromHead.printTimeMinutes,
    nozzleTemp:       fromHead.nozzleTemp       ?? fromTail.nozzleTemp,
    bedTemp:          fromHead.bedTemp          ?? fromTail.bedTemp,
    slicerName:       fromHead.slicerName       ?? fromTail.slicerName,
  };
}
