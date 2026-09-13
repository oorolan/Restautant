<script lang="ts">
  import { onMount } from 'svelte';
  import { notify, session } from '../lib/stores/session';
  import { configuracion } from '../lib/stores/configuracion';
  import { getInsumos, type Insumo } from '../lib/api/insumos';
  import { getKardex, type KardexEntry } from '../lib/api/kardex';
  import { getOrdenes, type Orden } from '../lib/api/ordenes';
  import { getRecepciones, type Recepcion } from '../lib/api/recepciones';

  let insumos: Insumo[] = [];
  let kardex: KardexEntry[] = [];
  let ordenes: Orden[] = [];
  let recepciones: Recepcion[] = [];
  let loading = true;

  // Active report tab
  let activeTab: 'inventario' | 'reposicion' | 'kardex' | 'ordenes' | 'recepciones' = 'inventario';

  // Filters
  let searchQuery = '';
  let kardexTipo = 'todos';
  let kardexInsumoId = '';
  let kardexDesde = '';
  let kardexHasta = '';
  let ordenesEstado = 'todos';

  // Heroicons SVG paths
  const icons = {
    print: 'M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656h10.5z',
    download: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
    search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
    alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    box: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    cart: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
    inbox: 'M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3',
    refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
  };

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const [ins, kar, ord, rec] = await Promise.all([
        getInsumos(),
        getKardex(),
        getOrdenes(),
        getRecepciones()
      ]);
      insumos = ins;
      kardex = kar;
      ordenes = ord;
      recepciones = rec;
    } catch (e: any) {
      notify('error', 'Error al cargar datos para reportes: ' + (e?.message || ''));
    } finally {
      loading = false;
    }
  }

  // Calculations
  $: valorTotalInventario = insumos.reduce((acc, i) => acc + (i.stock_actual * i.precio_unitario), 0);
  $: insumosCriticos = insumos.filter(i => i.stock_actual <= i.stock_minimo);
  $: insumosWarning = insumos.filter(i => i.stock_actual > i.stock_minimo && i.stock_actual <= i.stock_minimo * 1.5);

  // Insumos que requieren reposición (críticos y bajos)
  $: insumosParaReponer = insumos
    .filter(i => i.stock_actual <= i.stock_minimo * 1.5)
    .map(i => {
      // Objetivo: llegar a stock_minimo * 2 (stock de seguridad saludable)
      const stockMeta = Number((i.stock_minimo * 2).toFixed(1));
      const cantidadSugerida = Math.max(0, Number((stockMeta - i.stock_actual).toFixed(1)));
      const costoEstimado = Number((cantidadSugerida * i.precio_unitario).toFixed(2));
      return {
        ...i,
        stockMeta,
        cantidadSugerida,
        costoEstimado
      };
    })
    .sort((a, b) => (a.stock_actual / (a.stock_minimo || 1)) - (b.stock_actual / (b.stock_minimo || 1)));

  $: costoTotalReposicion = insumosParaReponer.reduce((acc, i) => acc + i.costoEstimado, 0);

  // Categorías y distribución de capital
  $: categoriaStats = (() => {
    const map: Record<string, { nombre: string; total: number; count: number }> = {};
    for (const ins of insumos) {
      const catName = ins.categorias?.nombre || 'Sin categoría';
      if (!map[catName]) {
        map[catName] = { nombre: catName, total: 0, count: 0 };
      }
      map[catName].total += (ins.stock_actual * ins.precio_unitario);
      map[catName].count += 1;
    }
    const list = Object.values(map);
    list.sort((a, b) => b.total - a.total);
    return list;
  })();

  // Filtered Inventario
  $: filteredInsumos = insumos.filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return i.nombre.toLowerCase().includes(q) ||
           (i.categorias?.nombre ?? '').toLowerCase().includes(q) ||
           (i.proveedores?.nombre ?? '').toLowerCase().includes(q);
  });

  // Filtered Kardex
  $: filteredKardex = kardex.filter(k => {
    let match = true;
    if (kardexInsumoId) match = match && String(k.insumo_id) === kardexInsumoId;
    if (kardexTipo !== 'todos') match = match && k.tipo === kardexTipo;
    if (kardexDesde) match = match && k.fecha >= kardexDesde;
    if (kardexHasta) match = match && k.fecha <= (kardexHasta + 'T23:59:59');
    if (searchQuery && activeTab === 'kardex') {
      const q = searchQuery.toLowerCase();
      const insName = (k.insumos?.nombre ?? '').toLowerCase();
      const ref = (k.referencia ?? '').toLowerCase();
      const usr = (k.usuarios?.nombre ?? '').toLowerCase();
      match = match && (insName.includes(q) || ref.includes(q) || usr.includes(q));
    }
    return match;
  });

  // Total rotación Kardex
  $: kardexEntradas = filteredKardex.filter(k => k.tipo === 'entrada').reduce((acc, k) => acc + k.cantidad, 0);
  $: kardexSalidas = filteredKardex.filter(k => k.tipo === 'salida').reduce((acc, k) => acc + k.cantidad, 0);

  // Filtered Ordenes
  $: filteredOrdenes = ordenes.filter(o => {
    let match = true;
    if (ordenesEstado !== 'todos') match = match && o.estado === ordenesEstado;
    if (searchQuery && activeTab === 'ordenes') {
      const q = searchQuery.toLowerCase();
      match = match && (
        String(o.id).includes(q) ||
        (o.proveedores?.nombre ?? '').toLowerCase().includes(q) ||
        (o.notas ?? '').toLowerCase().includes(q)
      );
    }
    return match;
  });

  // Helper para filtros rápidos de fechas en Kardex
  function setDateRange(range: 'hoy' | '7d' | '30d' | 'todo') {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (range === 'hoy') {
      kardexDesde = format(today);
      kardexHasta = format(today);
    } else if (range === '7d') {
      const past = new Date(today.getTime() - 7 * 86400000);
      kardexDesde = format(past);
      kardexHasta = format(today);
    } else if (range === '30d') {
      const past = new Date(today.getTime() - 30 * 86400000);
      kardexDesde = format(past);
      kardexHasta = format(today);
    } else {
      kardexDesde = '';
      kardexHasta = '';
    }
  }

  import { exportToExcel } from '../lib/utils/excel';

  function exportarInventario() {
    exportToExcel({
      reportTitle: 'Reporte de Inventario Valorizado',
      sheetName: 'Inventario',
      fileNamePrefix: 'Inventario_Valorizado',
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Insumo / Producto', key: 'nombre' },
        { header: 'Categoría', key: 'categorias.nombre', format: (v) => v || 'Sin categoría' },
        { header: 'Proveedor', key: 'proveedores.nombre', format: (v) => v || 'Sin proveedor' },
        { header: 'Unidad', key: 'unidad' },
        { header: 'Stock Actual', key: 'stock_actual', format: (v) => Number(v || 0).toFixed(2) },
        { header: 'Stock Mínimo', key: 'stock_minimo', format: (v) => Number(v || 0).toFixed(2) },
        { header: `Precio Unit. (${$configuracion.moneda_simbolo})`, key: 'precio_unitario', format: (v) => Number(v || 0).toFixed(2) },
        { header: `Valor Total (${$configuracion.moneda_simbolo})`, key: 'precio_unitario', format: (_, i) => (i.stock_actual * i.precio_unitario).toFixed(2) },
        { header: 'Estado', key: 'stock_actual', format: (_, i) => i.stock_actual <= i.stock_minimo ? 'CRÍTICO' : i.stock_actual <= i.stock_minimo * 1.5 ? 'BAJO' : 'ÓPTIMO' }
      ],
      data: filteredInsumos,
      summaryCards: [
        { label: 'Total Insumos', value: filteredInsumos.length },
        { label: 'Insumos Críticos', value: insumosCriticos.length },
        { label: 'Valor Total', value: `${$configuracion.moneda_simbolo} ${valorTotalInventario.toFixed(2)}` }
      ]
    });
    notify('success', 'Reporte de Inventario exportado a Excel (.xlsx)');
  }

  function exportarReposicion() {
    exportToExcel({
      reportTitle: 'Sugerencia de Compras y Reposición Crítica de Stock',
      sheetName: 'Reposicion',
      fileNamePrefix: 'Sugerido_Reposicion_Compras',
      columns: [
        { header: 'Insumo', key: 'nombre' },
        { header: 'Categoría', key: 'categorias.nombre', format: (v) => v || '—' },
        { header: 'Proveedor Habitual', key: 'proveedores.nombre', format: (v) => v || '—' },
        { header: 'Stock Actual', key: 'stock_actual', format: (v, i) => `${v} ${i.unidad}` },
        { header: 'Stock Mínimo', key: 'stock_minimo', format: (v, i) => `${v} ${i.unidad}` },
        { header: 'Cantidad Sugerida a Pedir', key: 'cantidadSugerida', format: (v, i) => `${v} ${i.unidad}` },
        { header: `Precio Estimado Unit. (${$configuracion.moneda_simbolo})`, key: 'precio_unitario', format: (v) => Number(v || 0).toFixed(2) },
        { header: `Costo Total Estimado (${$configuracion.moneda_simbolo})`, key: 'costoEstimado', format: (v) => Number(v || 0).toFixed(2) }
      ],
      data: insumosParaReponer,
      summaryCards: [
        { label: 'Insumos por Reponer', value: insumosParaReponer.length },
        { label: 'Presupuesto Total Estimado', value: `${$configuracion.moneda_simbolo} ${costoTotalReposicion.toFixed(2)}` }
      ]
    });
    notify('success', 'Sugerido de compras exportado a Excel (.xlsx)');
  }

  function exportarKardex() {
    exportToExcel({
      reportTitle: 'Kardex de Movimientos de Inventario',
      sheetName: 'Kardex',
      fileNamePrefix: 'Kardex_Movimientos',
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Fecha y Hora', key: 'fecha', format: (v) => v ? new Date(v).toLocaleString('es-ES') : '' },
        { header: 'Insumo', key: 'insumos.nombre', format: (v, k) => v || `Insumo #${k.insumo_id}` },
        { header: 'Unidad', key: 'insumos.unidad', format: (v) => v || '' },
        { header: 'Tipo Movimiento', key: 'tipo', format: (v) => String(v || '').toUpperCase() },
        { header: 'Cantidad', key: 'cantidad', format: (v) => Number(v || 0).toFixed(2) },
        { header: 'Saldo Resultante', key: 'saldo', format: (v) => Number(v || 0).toFixed(2) },
        { header: 'Referencia / Detalle', key: 'referencia', format: (v) => v || '' },
        { header: 'Usuario Responsable', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: filteredKardex,
      summaryCards: [
        { label: 'Movimientos Filtrados', value: filteredKardex.length },
        { label: 'Total Entradas', value: Number(kardexEntradas).toFixed(2) },
        { label: 'Total Salidas', value: Number(kardexSalidas).toFixed(2) }
      ]
    });
    notify('success', 'Kardex exportado a Excel (.xlsx)');
  }

  function exportarOrdenes() {
    exportToExcel({
      reportTitle: 'Control y Seguimiento de Órdenes de Compra',
      sheetName: 'Ordenes',
      fileNamePrefix: 'Ordenes_Compra',
      columns: [
        { header: 'N° Orden', key: 'id', format: (v) => `#${v}` },
        { header: 'Fecha Emisión', key: 'fecha' },
        { header: 'Proveedor', key: 'proveedores.nombre', format: (v) => v || 'Sin proveedor' },
        { header: 'Estado', key: 'estado', format: (v) => String(v || '').toUpperCase() },
        { header: 'Cantidad de Ítems', key: 'orden_detalle', format: (v) => Array.isArray(v) ? v.length : 0 },
        { header: 'Notas / Observaciones', key: 'notas', format: (v) => v || '' },
        { header: 'Emitido Por', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: filteredOrdenes,
      summaryCards: [
        { label: 'Total Órdenes', value: filteredOrdenes.length },
        { label: 'Pendientes', value: filteredOrdenes.filter(o => o.estado === 'pendiente').length },
        { label: 'Recibidas', value: filteredOrdenes.filter(o => o.estado === 'recibido').length }
      ]
    });
    notify('success', 'Órdenes exportadas a Excel (.xlsx)');
  }

  function exportarRecepciones() {
    exportToExcel({
      reportTitle: 'Registro de Ingresos y Recepciones de Mercadería',
      sheetName: 'Recepciones',
      fileNamePrefix: 'Recepciones_Mercaderia',
      columns: [
        { header: 'N° Recepción', key: 'id', format: (v) => `#${v}` },
        { header: 'Fecha de Ingreso', key: 'fecha' },
        { header: 'Orden Asociada', key: 'orden_id', format: (v) => v ? `Orden #${v}` : 'Ingreso Directo' },
        { header: 'Proveedor', key: 'ordenes.proveedores.nombre', format: (v) => v || 'No especificado' },
        { header: 'Ítems Recibidos', key: 'recepcion_detalle', format: (v) => Array.isArray(v) ? v.length : 0 },
        { header: 'Notas / Observaciones', key: 'notas', format: (v) => v || '' },
        { header: 'Recepcionado Por', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: recepciones,
      summaryCards: [
        { label: 'Total Recepciones', value: recepciones.length }
      ]
    });
    notify('success', 'Recepciones exportadas a Excel (.xlsx)');
  }

  function exportarReporteActual() {
    if (activeTab === 'inventario') exportarInventario();
    else if (activeTab === 'reposicion') exportarReposicion();
    else if (activeTab === 'kardex') exportarKardex();
    else if (activeTab === 'ordenes') exportarOrdenes();
    else if (activeTab === 'recepciones') exportarRecepciones();
  }

  function handlePrint() {
    window.print();
  }
</script>

<div class="page-enter">
  <!-- ENCABEZADO DE IMPRESIÓN OFICIAL (Solo visible en print) -->
  <div class="print-only print-header">
    <div class="print-header-top">
      <div>
        <h2 class="print-company-name">{$configuracion.nombre_comercial}</h2>
        <div class="print-company-sub">{$configuracion.razon_social} &bull; RUC/ID: {$configuracion.identificacion_fiscal}</div>
        <div class="print-company-sub">{$configuracion.direccion} &bull; Tel: {$configuracion.telefono} &bull; {$configuracion.email}</div>
      </div>
      <div class="print-meta-right">
        <div><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div><strong>Emitido por:</strong> {$session.usuario?.nombre ?? 'Administración'}</div>
        <div><strong>Moneda Oficial:</strong> {$configuracion.moneda_simbolo} ({$configuracion.moneda_codigo})</div>
      </div>
    </div>
    <div class="print-title-banner">
      INFORME OFICIAL DE AUDITORÍA Y CONTROL DE INVENTARIO
    </div>
  </div>

  <!-- Header en pantalla -->
  <div class="page-header no-print">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Reportes & Auditoría</h1>
        <p class="page-subtitle">Valorización, sugerido de compras, kardex y exportación formal</p>
      </div>
      <div class="flex gap-2">
        <button id="btn-exportar-reportes-excel" class="btn btn-excel" on:click={exportarReporteActual} title="Exportar reporte activo a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          Exportar a Excel
        </button>
        <button class="btn btn-secondary" on:click={handlePrint} title="Imprimir documento formal o guardar como PDF">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.print} />
          </svg>
          Imprimir / PDF
        </button>
      </div>
    </div>
  </div>

  <div class="page-body">
    <!-- Membrete institucional sutil en pantalla -->
    <div class="official-banner no-print">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="restaurant-badge">{$configuracion.nombre_comercial.substring(0, 2).toUpperCase()}</div>
          <div>
            <div class="font-bold text-sm text-primary">{$configuracion.nombre_comercial}</div>
            <div class="text-xs text-muted">{$configuracion.direccion} &bull; RUC/NIT: {$configuracion.identificacion_fiscal}</div>
          </div>
        </div>
        <div class="text-right text-xs text-muted">
          <div>Moneda: <strong class="text-accent">{$configuracion.moneda_simbolo} ({$configuracion.moneda_codigo})</strong></div>
          <div>Responsable: <strong class="text-primary">{$session.usuario?.nombre || 'Admin'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Executive KPI Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.box} />
          </svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{$configuracion.moneda_simbolo} {valorTotalInventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="stat-label">Capital total en inventario</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon danger">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.alert} />
          </svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{insumosCriticos.length}</div>
          <div class="stat-label">Insumos en quiebre crítico</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.cart} />
          </svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{$configuracion.moneda_simbolo} {costoTotalReposicion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="stat-label">Presupuesto sugerido reposición</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon accent">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.chart} />
          </svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{kardex.length}</div>
          <div class="stat-label">Movimientos auditados</div>
        </div>
      </div>
    </div>

    <!-- Pestañas de Reportes -->
    <div class="report-tabs no-print">
      <button
        class="tab-btn {activeTab === 'inventario' ? 'active' : ''}"
        on:click={() => { activeTab = 'inventario'; searchQuery = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.box} />
        </svg>
        Valorización de Inventario
      </button>

      <button
        class="tab-btn {activeTab === 'reposicion' ? 'active' : ''}"
        on:click={() => { activeTab = 'reposicion'; searchQuery = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.cart} />
        </svg>
        Sugerido de Compras ({insumosParaReponer.length})
      </button>

      <button
        class="tab-btn {activeTab === 'kardex' ? 'active' : ''}"
        on:click={() => { activeTab = 'kardex'; searchQuery = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.chart} />
        </svg>
        Kardex & Movimientos
      </button>

      <button
        class="tab-btn {activeTab === 'ordenes' ? 'active' : ''}"
        on:click={() => { activeTab = 'ordenes'; searchQuery = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.inbox} />
        </svg>
        Órdenes de Compra
      </button>

      <button
        class="tab-btn {activeTab === 'recepciones' ? 'active' : ''}"
        on:click={() => { activeTab = 'recepciones'; searchQuery = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.refresh} />
        </svg>
        Recepción Mercadería
      </button>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else}
      <!-- TAB 1: VALORIZACIÓN DE INVENTARIO -->
      {#if activeTab === 'inventario'}
        <!-- Distribución Visual por Categorías -->
        <div class="card mb-4 no-print">
          <div class="card-header pb-2">
            <h4 class="text-sm font-semibold">Distribución de Capital por Categoría</h4>
          </div>
          <div class="card-body pt-1">
            <div class="category-distribution">
              {#each categoriaStats as cat}
                {@const pct = valorTotalInventario > 0 ? (cat.total / valorTotalInventario) * 100 : 0}
                <div class="category-bar-item">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="font-medium">{cat.nombre} ({cat.count})</span>
                    <span class="text-muted">{$configuracion.moneda_simbolo} {cat.total.toFixed(2)} &bull; {pct.toFixed(1)}%</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill" style="width: {pct}%;"></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <div class="search-input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16" class="search-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d={icons.search} />
              </svg>
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Buscar insumo o categoría..."
                bind:value={searchQuery}
              />
            </div>
            <span class="text-xs text-muted">{filteredInsumos.length} de {insumos.length} insumos</span>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-excel btn-sm" on:click={exportarInventario}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
              </svg>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Stock Actual</th>
                <th>Stock Mín.</th>
                <th>Precio Unit.</th>
                <th>Valor Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredInsumos as i (i.id)}
                <tr>
                  <td><strong>{i.nombre}</strong></td>
                  <td class="text-sm text-muted">{i.categorias?.nombre ?? '—'}</td>
                  <td class="text-sm text-muted">{i.proveedores?.nombre ?? '—'}</td>
                  <td>
                    <strong>{i.stock_actual}</strong> <span class="text-xs text-muted">{i.unidad}</span>
                  </td>
                  <td class="text-sm text-muted">{i.stock_minimo} {i.unidad}</td>
                  <td class="text-sm">{$configuracion.moneda_simbolo} {i.precio_unitario.toFixed(2)}</td>
                  <td><strong>{$configuracion.moneda_simbolo} {(i.stock_actual * i.precio_unitario).toFixed(2)}</strong></td>
                  <td>
                    {#if i.stock_actual <= i.stock_minimo}
                      <span class="badge badge-danger">Crítico</span>
                    {:else if i.stock_actual <= i.stock_minimo * 1.5}
                      <span class="badge badge-warning">Bajo</span>
                    {:else}
                      <span class="badge badge-success">Óptimo</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="table-total-row">
                <td colspan="6" class="text-right"><strong>VALOR TOTAL DEL INVENTARIO:</strong></td>
                <td colspan="2"><strong>{$configuracion.moneda_simbolo} {valorTotalInventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

      <!-- TAB 2: SUGERIDO DE COMPRAS / REPOSICIÓN URGENTE -->
      {:else if activeTab === 'reposicion'}
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="text-sm font-semibold">
              {insumosParaReponer.length} insumos necesitan reposición de stock
            </span>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-excel btn-sm" on:click={exportarReposicion}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
              </svg>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Proveedor Sugerido</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Pedido Sugerido</th>
                <th>Precio Unit.</th>
                <th>Costo Estimado</th>
                <th>Nivel de Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {#if insumosParaReponer.length === 0}
                <tr>
                  <td colspan="8" class="text-center py-6 text-muted">
                    No hay insumos en estado crítico ni bajo. El inventario se encuentra en niveles óptimos.
                  </td>
                </tr>
              {:else}
                {#each insumosParaReponer as item (item.id)}
                  <tr>
                    <td><strong>{item.nombre}</strong></td>
                    <td class="text-sm">
                      <div class="font-medium">{item.proveedores?.nombre ?? 'No asignado'}</div>
                      <div class="text-xs text-muted">{item.proveedores?.telefono ?? ''}</div>
                    </td>
                    <td>
                      <span class="font-bold {item.stock_actual <= item.stock_minimo ? 'text-danger' : 'text-warning'}">
                        {item.stock_actual}
                      </span>
                      <span class="text-xs text-muted">{item.unidad}</span>
                    </td>
                    <td class="text-sm text-muted">{item.stock_minimo} {item.unidad}</td>
                    <td>
                      <span class="badge badge-neutral font-bold text-accent">
                        +{item.cantidadSugerida} {item.unidad}
                      </span>
                    </td>
                    <td class="text-sm">{$configuracion.moneda_simbolo} {item.precio_unitario.toFixed(2)}</td>
                    <td><strong>{$configuracion.moneda_simbolo} {item.costoEstimado.toFixed(2)}</strong></td>
                    <td>
                      {#if item.stock_actual <= item.stock_minimo}
                        <span class="badge badge-danger">Urgente (Quiebre)</span>
                      {:else}
                        <span class="badge badge-warning">Preventivo (Bajo)</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
            <tfoot>
              <tr class="table-total-row">
                <td colspan="6" class="text-right"><strong>PRESUPUESTO TOTAL ESTIMADO:</strong></td>
                <td colspan="2"><strong>{$configuracion.moneda_simbolo} {costoTotalReposicion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

      <!-- TAB 3: KARDEX -->
      {:else if activeTab === 'kardex'}
        <div class="toolbar" style="flex-wrap:wrap; gap:10px;">
          <div class="toolbar-left" style="flex-wrap:wrap; gap:8px;">
            <div class="date-quick-filters">
              <button class="btn btn-ghost btn-xs" on:click={() => setDateRange('hoy')}>Hoy</button>
              <button class="btn btn-ghost btn-xs" on:click={() => setDateRange('7d')}>7 Días</button>
              <button class="btn btn-ghost btn-xs" on:click={() => setDateRange('30d')}>30 Días</button>
              <button class="btn btn-ghost btn-xs" on:click={() => setDateRange('todo')}>Todo</button>
            </div>

            <select class="form-control form-control-sm" style="width:170px;" bind:value={kardexInsumoId}>
              <option value="">Todos los insumos</option>
              {#each insumos as ins}
                <option value={String(ins.id)}>{ins.nombre}</option>
              {/each}
            </select>

            <select class="form-control form-control-sm" style="width:130px;" bind:value={kardexTipo}>
              <option value="todos">Todos los tipos</option>
              <option value="entrada">Solo Entradas</option>
              <option value="salida">Solo Salidas</option>
            </select>

            <div class="flex items-center gap-1 text-xs">
              <span class="text-muted">Desde:</span>
              <input class="form-control form-control-sm" type="date" bind:value={kardexDesde} />
            </div>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-muted">Hasta:</span>
              <input class="form-control form-control-sm" type="date" bind:value={kardexHasta} />
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-excel btn-sm" on:click={exportarKardex}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
              </svg>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div class="kardex-summary-bar no-print">
          <span class="text-xs">
            Entradas: <strong class="text-success">+{kardexEntradas.toFixed(1)}</strong>
          </span>
          <span class="text-xs">
            Salidas: <strong class="text-danger">-{kardexSalidas.toFixed(1)}</strong>
          </span>
          <span class="text-xs text-muted">
            {filteredKardex.length} registros encontrados
          </span>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Saldo</th>
                <th>Referencia / Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredKardex as k (k.id)}
                <tr>
                  <td class="text-sm">{k.fecha ? new Date(k.fecha).toLocaleString() : '—'}</td>
                  <td><strong>{k.insumos?.nombre ?? `Insumo #${k.insumo_id}`}</strong></td>
                  <td>
                    <span class="badge {k.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}">
                      {k.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td><strong>{k.cantidad}</strong> <span class="text-xs text-muted">{k.insumos?.unidad ?? ''}</span></td>
                  <td><strong>{k.saldo}</strong></td>
                  <td class="text-sm text-muted">{k.referencia || '—'}</td>
                  <td class="text-sm">{k.usuarios?.nombre ?? 'Sistema'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

      <!-- TAB 4: ORDENES -->
      {:else if activeTab === 'ordenes'}
        <div class="toolbar">
          <div class="toolbar-left" style="gap:8px;">
            <select class="form-control form-control-sm" style="width:160px;" bind:value={ordenesEstado}>
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="recibido">Recibidos</option>
              <option value="cancelado">Cancelados</option>
            </select>
            <span class="text-xs text-muted">{filteredOrdenes.length} órdenes registradas</span>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-excel btn-sm" on:click={exportarOrdenes}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
              </svg>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th># Orden</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Ítems</th>
                <th>Notas</th>
                <th>Creado por</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredOrdenes as o (o.id)}
                <tr>
                  <td><strong>#{o.id}</strong></td>
                  <td class="text-sm">{o.fecha}</td>
                  <td>{o.proveedores?.nombre ?? '—'}</td>
                  <td>
                    <span class="badge {o.estado === 'pendiente' ? 'badge-warning' : o.estado === 'recibido' ? 'badge-success' : 'badge-neutral'}">
                      {o.estado}
                    </span>
                  </td>
                  <td>{o.orden_detalle?.length ?? 0} insumos</td>
                  <td class="text-sm text-muted">{o.notas || '—'}</td>
                  <td class="text-sm">{o.usuarios?.nombre ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

      <!-- TAB 5: RECEPCIONES -->
      {:else if activeTab === 'recepciones'}
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="text-sm font-semibold">{recepciones.length} ingresos registrados</span>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-excel btn-sm" on:click={exportarRecepciones}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
              </svg>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th># Recepción</th>
                <th>Fecha</th>
                <th>Orden Asociada</th>
                <th>Ítems Recibidos</th>
                <th>Notas</th>
                <th>Recibido por</th>
              </tr>
            </thead>
            <tbody>
              {#each recepciones as r (r.id)}
                <tr>
                  <td><strong>#{r.id}</strong></td>
                  <td class="text-sm">{r.fecha}</td>
                  <td>{r.orden_id ? `Orden #${r.orden_id}` : 'Directa'}</td>
                  <td class="text-sm">
                    {#if r.recepcion_detalle}
                      {r.recepcion_detalle.map(d => `${d.cantidad_recibida} ${d.insumos?.unidad ?? ''} ${d.insumos?.nombre ?? ''}`).join(', ')}
                    {/if}
                  </td>
                  <td class="text-sm text-muted">{r.notas || '—'}</td>
                  <td class="text-sm">{r.usuarios?.nombre ?? 'Sistema'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}

    <!-- Pie de página con firmas para impresión/auditoría -->
    <div class="report-audit-footer">
      <div class="legal-notice">
        {$configuracion.pie_reportes || 'Documento interno confidencial para control y auditoría de inventario.'}
      </div>
      <div class="signatures-grid">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-name">{$session.usuario?.nombre || 'Administrador'}</div>
          <div class="signature-role">Responsable de Auditoría</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-name">Jefatura de Almacén y Cocina</div>
          <div class="signature-role">Conforme Recepción / Stock</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Print Official Header */
  .print-header {
    border-bottom: 2px solid #1e293b;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .print-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .print-company-name {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }

  .print-company-sub {
    font-size: 8.5pt;
    color: #475569;
    margin-top: 2px;
  }

  .print-meta-right {
    text-align: right;
    font-size: 8.5pt;
    color: #334155;
    line-height: 1.4;
  }

  .print-title-banner {
    margin-top: 10px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    text-align: center;
    font-weight: 700;
    font-size: 10pt;
    color: #1e293b;
    padding: 4px;
    letter-spacing: 0.5px;
  }

  /* Screen Official Banner */
  .official-banner {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    margin-bottom: 20px;
  }

  .restaurant-badge {
    width: 36px;
    height: 36px;
    background: var(--accent);
    color: #000;
    font-weight: 800;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
  }

  /* Tabs */
  .report-tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
    margin-bottom: 20px;
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .tab-btn.active {
    background: var(--accent-bg);
    color: var(--accent);
    border-color: var(--border-accent);
    font-weight: 600;
  }

  /* Category Visual Distribution */
  .category-distribution {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .category-bar-item {
    width: 100%;
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent) 0%, #fbbf24 100%);
    border-radius: 999px;
  }

  /* Quick Date Filters */
  .date-quick-filters {
    display: flex;
    gap: 4px;
    background: var(--bg-surface);
    padding: 2px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .btn-xs {
    padding: 2px 8px;
    font-size: 0.75rem;
  }

  .search-input-wrapper {
    position: relative;
    width: 220px;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
  }

  .search-input-wrapper .form-control {
    padding-left: 32px;
  }

  .kardex-summary-bar {
    display: flex;
    gap: 16px;
    align-items: center;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    margin-bottom: 12px;
  }

  .table-total-row {
    background: rgba(255, 255, 255, 0.02);
    font-size: 0.875rem;
    border-top: 2px solid var(--border);
  }

  /* Footer & Signatures */
  .report-audit-footer {
    margin-top: 30px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .legal-notice {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    margin-bottom: 24px;
  }

  .signatures-grid {
    display: flex;
    justify-content: space-around;
    gap: 30px;
    margin-top: 20px;
  }

  .signature-box {
    text-align: center;
    width: 200px;
  }

  .signature-line {
    border-top: 1px solid var(--text-muted);
    margin-bottom: 6px;
  }

  .signature-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .signature-role {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  @media print {
    .report-audit-footer {
      border-top: 1px dashed #cbd5e1 !important;
      margin-top: 25px !important;
    }

    .legal-notice {
      color: #64748b !important;
    }

    .signature-line {
      border-top: 1px solid #1e293b !important;
    }

    .signature-name {
      color: #0f172a !important;
    }

    .signature-role {
      color: #475569 !important;
    }

    .table-total-row {
      background: #f8fafc !important;
      color: #0f172a !important;
    }
  }
</style>
