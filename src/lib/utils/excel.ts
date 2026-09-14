import * as XLSX from 'xlsx';
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

function resolveNestedKey(obj: any, path: string): any {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
}

export function exportToExcel<T = any>(options: ExcelExportOptions<T>) {
  const {
    reportTitle,
    sheetName = 'Reporte',
    fileNamePrefix,
    columns,
    data,
    summaryCards = []
  } = options;

  const config = get(configuracion);
  const currentSession = get(session);
  const userName = currentSession?.usuario?.nombre || 'Administrador';
  const userRole = currentSession?.usuario?.rol === 'admin' ? 'Administrador' 
    : currentSession?.usuario?.rol === 'jefe_almacen' ? 'Jefe de Almacén' 
    : 'Empleado';

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const timestamp = `${fechaStr} ${horaStr}`;

  const numCols = Math.max(columns.length, 6);
  const lastColIdx = numCols - 1;

  // Matriz de filas
  const rows: any[][] = [];
  const merges: XLSX.Range[] = [];

  // 1. Membrete institucional
  const nombreEmpresa = (config.nombre_comercial || 'RESTAURANTSTOCK').toUpperCase();
  rows.push([nombreEmpresa]); // Fila 0
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } });

  const datosFiscales = [
    config.razon_social ? `Razón Social: ${config.razon_social}` : '',
    config.identificacion_fiscal ? `RUC/NIT: ${config.identificacion_fiscal}` : '',
    config.telefono ? `Tel: ${config.telefono}` : '',
    config.direccion ? `Dirección: ${config.direccion}` : ''
  ].filter(Boolean).join('  |  ') || 'Sistema de Control de Inventario y Almacén';
  rows.push([datosFiscales]); // Fila 1
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } });

  // 2. Título del Reporte
  rows.push([`REPORTE EJECUTIVO: ${reportTitle.toUpperCase()}`]); // Fila 2
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } });

  // 3. Metadatos de Emisión
  rows.push([`Fecha de Generación: ${timestamp}   |   Generado por: ${userName} (${userRole})   |   Moneda: ${config.moneda || 'PEN'} (${config.moneda_simbolo || 'S/.'})`]); // Fila 3
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } });

  rows.push([]); // Fila 4 (Separador)

  // 4. Tarjetas de Resumen Ejecutivo (si existen)
  if (summaryCards.length > 0) {
    const cardLabelsRow: any[] = [];
    const cardValuesRow: any[] = [];
    summaryCards.forEach(s => {
      cardLabelsRow.push(s.label.toUpperCase());
      cardValuesRow.push(s.value);
    });
    rows.push(cardLabelsRow); // Fila 5
    rows.push(cardValuesRow);  // Fila 6
    rows.push([]); // Fila 7 (Separador)
  }

  // 5. Fila de Encabezados de la Tabla
  const tableHeaderRowIndex = rows.length;
  const headerRow = columns.map(c => c.header);
  rows.push(headerRow);

  // 6. Filas de Datos
  data.forEach((item, index) => {
    const rowValues = columns.map(col => {
      if (col.key === '#') return index + 1;
      const rawVal = resolveNestedKey(item, col.key);
      if (col.format) {
        return col.format(rawVal, item);
      }
      if (rawVal === null || rawVal === undefined) return '';
      return rawVal;
    });
    rows.push(rowValues);
  });

  // 7. Pie de Página y Auditoría
  const footerRowIndex = rows.length + 1;
  rows.push([]);
  const pieTexto = config.pie_reportes || 'DOCUMENTO OFICIAL GENERADO POR EL SISTEMA RESTAURANTSTOCK. INFORMACIÓN CONFIDENCIAL Y AUDITABLE.';
  rows.push([pieTexto]);
  merges.push({ s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: lastColIdx } });

  // Crear la hoja
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Asignar celdas combinadas (Merges)
  ws['!merges'] = merges;

  // Auto-filtro para los encabezados de la tabla
  const lastRowIdx = tableHeaderRowIndex + data.length;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: tableHeaderRowIndex, c: 0 },
      e: { r: lastRowIdx, c: columns.length - 1 }
    })
  };

  // Cálculo preciso y holgado de anchos de columna
  const colWidths: { wch: number }[] = columns.map((col, cIdx) => {
    if (col.width) return { wch: col.width };
    let maxLen = col.header.length;

    data.forEach(item => {
      const raw = resolveNestedKey(item, col.key);
      const val = col.format ? String(col.format(raw, item) || '') : String(raw || '');
      if (val.length > maxLen) {
        maxLen = Math.min(val.length, 50);
      }
    });

    // Ancho mínimo generoso según el tipo de columna
    const basePadding = 5;
    const finalWidth = Math.max(maxLen + basePadding, 14);
    return { wch: finalWidth };
  });

  ws['!cols'] = colWidths;

  // Crear y guardar el libro de trabajo
  const wb = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 30) || 'Reporte';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const dateFile = now.toISOString().slice(0, 10);
  const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanPrefix}_${dateFile}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

