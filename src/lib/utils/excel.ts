// @ts-ignore - xlsx-js-style is compatible with xlsx but has its own types
import XLSXStyle from 'xlsx-js-style';
import { get } from 'svelte/store';
import { configuracion } from '../stores/configuracion';
import { session } from '../stores/session';

export interface ExcelColumn<T = any> {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'currency' | 'date';
  format?: (value: any, row: T) => any;
}

export interface ExcelSummaryCard {
  label: string;
  value: string | number;
}

export interface ExcelExportOptions<T = any> {
  reportTitle: string;
  sheetName?: string;
  fileNamePrefix: string;
  columns: ExcelColumn<T>[];
  data: T[];
  summaryCards?: ExcelSummaryCard[];
}

// Color palette
const C = {
  brandDark:  '1A2B4A',
  brandMid:   '2563EB',
  brandLight: 'DBEAFE',
  accent:     'F59E0B',
  white:      'FFFFFF',
  light1:     'F8FAFC',
  light2:     'EFF6FF',
  border:     'CBD5E1',
  subheader:  '334155',
  textMuted:  '64748B',
  green:      '16A34A',
  red:        'DC2626',
  summaryBg:  'FEF3C7',
  summaryFg:  '92400E',
};

function mkFont(opts: { bold?: boolean; sz?: number; color?: string; italic?: boolean }) {
  return { name: 'Calibri', sz: opts.sz ?? 11, bold: opts.bold ?? false, italic: opts.italic ?? false, color: { rgb: opts.color ?? '000000' } };
}

function mkFill(hex: string) {
  return { patternType: 'solid', fgColor: { rgb: hex } };
}

function mkBorders(thick = false) {
  const b = thick ? { style: 'medium', color: { rgb: '1A2B4A' } } : { style: 'thin', color: { rgb: 'CBD5E1' } };
  return { top: b, bottom: b, left: b, right: b };
}

function mkCell(v: any, opts: { bold?: boolean; sz?: number; fgColor?: string; fontColor?: string; italic?: boolean; hAlign?: 'left'|'center'|'right'; border?: boolean; thick?: boolean; wrapText?: boolean } = {}): any {
  const { bold=false, sz=10, fgColor, fontColor='1E293B', italic=false, hAlign='left', border=true, thick=false, wrapText=false } = opts;
  const s: any = { font: mkFont({ bold, sz, color: fontColor, italic }), alignment: { horizontal: hAlign, vertical: 'center', wrapText } };
  if (fgColor) s.fill = mkFill(fgColor);
  if (border) s.border = mkBorders(thick);
  return { v, t: typeof v === 'number' ? 'n' : 's', s };
}

function resolveKey(obj: any, path: string): any {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc: any, p: string) => (acc && acc[p] !== undefined ? acc[p] : ''), obj);
}

function enc(r: number, c: number): string {
  return XLSXStyle.utils.encode_cell({ r, c });
}

export function exportToExcel<T = any>(options: ExcelExportOptions<T>) {
  const { reportTitle, sheetName = 'Reporte', fileNamePrefix, columns, data, summaryCards = [] } = options;

  const config   = get(configuracion);
  const sess     = get(session);
  const userName = sess?.usuario?.nombre || 'Administrador';
  const userRole = sess?.usuario?.rol === 'admin' ? 'Administrador' : sess?.usuario?.rol === 'jefe_almacen' ? 'Jefe de Almacen' : 'Empleado';

  const now      = new Date();
  const fechaStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr  = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const numCols = Math.max(columns.length, 6);
  const lastC   = numCols - 1;
  const ws: any = {};
  const merges: any[] = [];
  let R = 0;

  const banner = (v: string, s: any) => {
    ws[enc(R, 0)] = { v, t: 's', s };
    for (let c = 1; c <= lastC; c++) ws[enc(R, c)] = { v: '', t: 's', s };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: lastC } });
    R++;
  };

  // ROW 0: Nombre empresa
  banner((config.nombre_comercial || 'RESTAURANTSTOCK').toUpperCase(), {
    font: mkFont({ bold: true, sz: 16, color: C.white }), fill: mkFill(C.brandDark),
    alignment: { horizontal: 'center', vertical: 'center' }, border: mkBorders(true)
  });

  // ROW 1: Datos fiscales
  const fiscal = [
    config.razon_social ? ('Razon Social: ' + config.razon_social) : '',
    config.identificacion_fiscal ? ('RUC/NIT: ' + config.identificacion_fiscal) : '',
    config.telefono ? ('Tel: ' + config.telefono) : '',
    config.direccion ? ('Dir: ' + config.direccion) : '',
  ].filter(Boolean).join('   |   ') || 'Sistema de Control de Inventario';
  banner(fiscal, {
    font: mkFont({ sz: 9, color: C.accent }), fill: mkFill(C.subheader),
    alignment: { horizontal: 'center', vertical: 'center' }, border: mkBorders()
  });

  // ROW 2: Titulo
  banner('REPORTE: ' + reportTitle.toUpperCase(), {
    font: mkFont({ bold: true, sz: 13, color: C.white }), fill: mkFill(C.brandMid),
    alignment: { horizontal: 'center', vertical: 'center' }, border: mkBorders(true)
  });

  // ROW 3: Metadatos
  const moneda   = (config.moneda_codigo || 'PEN') + ' (' + (config.moneda_simbolo || 'S/.') + ')';
  const metaText = 'Fecha: ' + fechaStr + ' ' + horaStr + '   |   Generado por: ' + userName + ' (' + userRole + ')   |   Moneda: ' + moneda;
  banner(metaText, {
    font: mkFont({ sz: 9, color: C.subheader, italic: true }), fill: mkFill(C.brandLight),
    alignment: { horizontal: 'center', vertical: 'center' }, border: mkBorders()
  });

  // ROW 4: Separador
  for (let c = 0; c <= lastC; c++) ws[enc(R, c)] = { v: '', t: 's', s: { fill: mkFill(C.white) } };
  R++;

  // Resumen ejecutivo
  if (summaryCards.length > 0) {
    for (let c = 0; c < numCols; c++) {
      const sc = summaryCards[c];
      ws[enc(R, c)] = mkCell(sc ? sc.label.toUpperCase() : '', { bold: true, sz: 9, fgColor: C.brandMid, fontColor: C.white, hAlign: 'center', wrapText: true });
    }
    R++;
    for (let c = 0; c < numCols; c++) {
      const sc = summaryCards[c];
      ws[enc(R, c)] = mkCell(sc ? sc.value : '', { bold: true, sz: 14, fgColor: C.summaryBg, fontColor: C.summaryFg, hAlign: 'center' });
    }
    R++;
    for (let c = 0; c <= lastC; c++) ws[enc(R, c)] = { v: '', t: 's', s: { fill: mkFill(C.white) } };
    R++;
  }

  // Encabezados de tabla
  const tableHeaderRow = R;
  columns.forEach((col, ci) => {
    ws[enc(R, ci)] = mkCell(col.header, { bold: true, sz: 10, fgColor: C.brandDark, fontColor: C.white, hAlign: 'center', thick: true });
  });
  R++;

  // Filas de datos
  (data as any[]).forEach((item, rowIdx) => {
    const bg = rowIdx % 2 === 0 ? C.light1 : C.light2;
    columns.forEach((col, ci) => {
      const raw  = col.key === '#' ? rowIdx + 1 : resolveKey(item, col.key);
      const disp = col.format ? col.format(raw, item) : (raw ?? '');
      const isNum = typeof disp === 'number';
      const numV  = isNum ? Number(disp) : null;
      let fontColor = '1E293B';
      if (numV !== null && (col.type === 'currency' || col.type === 'number')) {
        if (numV < 0) fontColor = C.red;
        else if (numV > 0 && col.key.toLowerCase().includes('entrada')) fontColor = C.green;
      }
      const hAlign: 'left'|'center'|'right' = isNum ? 'right' : ci === 0 ? 'center' : 'left';
      ws[enc(R, ci)] = mkCell(disp, { fgColor: bg, fontColor, hAlign });
    });
    R++;
  });

  // Pie de pagina
  for (let c = 0; c <= lastC; c++) ws[enc(R, c)] = { v: '', t: 's', s: { fill: mkFill(C.white) } };
  R++;
  banner(config.pie_reportes || 'Documento oficial generado por RestaurantStock. Informacion confidencial y auditable.', {
    font: mkFont({ sz: 8, color: C.textMuted, italic: true }), fill: mkFill(C.brandLight),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: mkBorders()
  });

  // Configuracion de hoja
  ws['!ref']        = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R, c: lastC } });
  ws['!merges']     = merges;
  ws['!autofilter'] = { ref: XLSXStyle.utils.encode_range({ s: { r: tableHeaderRow, c: 0 }, e: { r: tableHeaderRow + data.length, c: columns.length - 1 } }) };
  ws['!cols']       = columns.map((col) => {
    if (col.width) return { wch: col.width };
    let max = col.header.length;
    (data as any[]).forEach(item => {
      const raw = resolveKey(item, col.key);
      const v   = col.format ? String(col.format(raw, item) ?? '') : String(raw ?? '');
      if (v.length > max) max = Math.min(v.length, 50);
    });
    return { wch: Math.max(max + 5, 14) };
  });
  ws['!rows'] = Array.from({ length: R + 1 }, (_, i) => {
    if (i === 0) return { hpt: 30 };
    if (i === 2) return { hpt: 24 };
    if (i === tableHeaderRow) return { hpt: 20 };
    return { hpt: 16 };
  });
  ws['!pageSetup'] = { orientation: columns.length > 7 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSXStyle.utils.book_new();
  const safeName = sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 30) || 'Reporte';
  XLSXStyle.utils.book_append_sheet(wb, ws, safeName);

  const fileName = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + now.toISOString().slice(0, 10) + '.xlsx';
  XLSXStyle.writeFile(wb, fileName);
}
