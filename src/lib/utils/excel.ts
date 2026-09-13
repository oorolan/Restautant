import * as XLSX from 'xlsx';
import { get } from 'svelte/store';
import { configuracion } from '../stores/configuracion';
import { session } from '../stores/session';

export interface ExcelColumn<T = any> {
  header: string;
  key: string;
  width?: number;
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
  const userRole = currentSession?.usuario?.rol || 'admin';

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

  // Construcción de la matriz (Array of Arrays)
  const rows: any[][] = [];

  // 1. Membrete del Restaurante
  rows.push([config.nombre_comercial ? config.nombre_comercial.toUpperCase() : 'RESTAURANTE']);
  rows.push([
    `${config.razon_social || ''}${config.identificacion_fiscal ? ` | RUC/ID: ${config.identificacion_fiscal}` : ''}${config.telefono ? ` | Tel: ${config.telefono}` : ''}${config.direccion ? ` | Dir: ${config.direccion}` : ''}`
  ]);
  rows.push([`REPORTE: ${reportTitle.toUpperCase()}`]);
  rows.push([`Fecha y Hora: ${timestamp} | Emitido por: ${userName} (${userRole})`]);
  rows.push([]); // Espaciador

  // 2. Resumen métrico (si existe)
  if (summaryCards.length > 0) {
    const summaryLabels = summaryCards.map(s => s.label.toUpperCase());
    const summaryValues = summaryCards.map(s => s.value);
    rows.push(summaryLabels);
    rows.push(summaryValues);
    rows.push([]); // Espaciador
  }

  // 3. Encabezados de la Tabla
  const headerRow = columns.map(c => c.header);
  rows.push(headerRow);

  // 4. Filas de Datos
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

  // 5. Pie de auditoría
  rows.push([]);
  rows.push([config.pie_reportes || 'Documento confidencial generado por el Sistema de Gestión de Inventario RestaurantStock.']);

  // Crear la hoja de trabajo
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Calcular anchos de columna automáticos
  const colWidths: { wch: number }[] = columns.map(col => {
    if (col.width) return { wch: col.width };
    let maxLen = col.header.length;
    data.forEach(item => {
      const raw = resolveNestedKey(item, col.key);
      const val = col.format ? String(col.format(raw, item) || '') : String(raw || '');
      if (val.length > maxLen) {
        maxLen = Math.min(val.length, 60);
      }
    });
    return { wch: Math.max(maxLen + 4, 12) };
  });

  ws['!cols'] = colWidths;

  // Crear libro
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Nombre de archivo sanitizado
  const dateFile = now.toISOString().slice(0, 10);
  const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanPrefix}_${dateFile}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}
