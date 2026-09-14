<script lang="ts">
  import { onMount } from 'svelte';
  import { notify } from '../lib/stores/session';
  import { getKardex, type KardexEntry } from '../lib/api/kardex';
  import { getInsumos, type Insumo } from '../lib/api/insumos';
  import { exportToExcel } from '../lib/utils/excel';

  let entries: KardexEntry[] = [];
  let insumos: Insumo[] = [];
  let loading = true;

  let filterInsumo = '';
  let filterDesde = '';
  let filterHasta = '';

  onMount(async () => {
    try {
      [insumos] = await Promise.all([getInsumos()]);
      await loadKardex();
    } catch (e: any) {
      notify('error', e.message);
      loading = false;
    }
  });

  async function loadKardex() {
    loading = true;
    try {
      entries = await getKardex(
        filterInsumo ? Number(filterInsumo) : undefined,
        filterDesde || undefined,
        filterHasta || undefined
      );
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      loading = false;
    }
  }

  $: entradas = entries.filter(e => e.tipo === 'entrada').length;
  $: salidas  = entries.filter(e => e.tipo === 'salida').length;

  function handleExportExcel() {
    if (entries.length === 0) {
      notify('warning', 'No hay movimientos en el Kardex para exportar');
      return;
    }
    const insumoSeleccionado = insumos.find(i => String(i.id) === filterInsumo);
    const titulo = insumoSeleccionado 
      ? `Historial Kardex - Insumo: ${insumoSeleccionado.nombre}`
      : 'Historial General de Movimientos Kardex (Entradas y Salidas)';

    exportToExcel({
      reportTitle: titulo,
      sheetName: 'Kardex',
      fileNamePrefix: 'Kardex_Movimientos',
      columns: [
        { header: '#', key: '#' },
        { 
          header: 'Fecha y Hora', 
          key: 'fecha', 
          format: (v) => v ? new Date(v).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '' 
        },
        { header: 'Insumo / Producto', key: 'insumos.nombre', format: (v) => v || 'Insumo' },
        { header: 'Unidad', key: 'insumos.unidad', format: (v) => v || '' },
        { header: 'Motivo / Referencia', key: 'referencia', format: (v) => v || 'Movimiento directo' },
        { 
          header: 'ENTRADA (+)', 
          key: 'cantidad', 
          format: (v, item) => item.tipo === 'entrada' ? `+${Number(v || 0).toFixed(2)}` : '—' 
        },
        { 
          header: 'SALIDA (-)', 
          key: 'cantidad', 
          format: (v, item) => item.tipo === 'salida' ? `-${Number(v || 0).toFixed(2)}` : '—' 
        },
        { 
          header: 'SALDO STOCK', 
          key: 'saldo', 
          format: (v) => Number(v || 0).toFixed(2) 
        },
        { header: 'Responsable', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: entries,
      summaryCards: [
        { label: 'Total Movimientos', value: entries.length },
        { label: 'Entradas Registradas', value: entradas },
        { label: 'Salidas Registradas', value: salidas }
      ]
    });
    notify('success', 'Kardex exportado a Excel exitosamente');
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Kardex de Inventario</h1>
        <p class="page-subtitle">Registro cronológico detallado de entradas, salidas y saldos de insumos</p>
      </div>
      <button id="btn-exportar-kardex-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar movimientos a Microsoft Excel (.xlsx)">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
        </svg>
        <span>Exportar Excel</span>
      </button>
    </div>
  </div>

  <div class="page-body">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value">{entries.length}</div>
          <div class="stat-label">Total movimientos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value text-success">{entradas}</div>
          <div class="stat-label">Entradas registradas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value text-danger">{salidas}</div>
          <div class="stat-label">Salidas registradas</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="toolbar">
      <div class="toolbar-left" style="flex-wrap: wrap; gap: 12px;">
        <select id="filter-kardex-insumo" class="form-control" style="width: 220px;" bind:value={filterInsumo}>
          <option value="">Todos los insumos</option>
          {#each insumos as i}
            <option value={String(i.id)}>{i.nombre}</option>
          {/each}
        </select>
        <div class="flex items-center gap-2">
          <label class="form-label" style="margin:0; white-space:nowrap;">Desde:</label>
          <input id="filter-desde" class="form-control" type="date" bind:value={filterDesde} />
        </div>
        <div class="flex items-center gap-2">
          <label class="form-label" style="margin:0; white-space:nowrap;">Hasta:</label>
          <input id="filter-hasta" class="form-control" type="date" bind:value={filterHasta} />
        </div>
        <button class="btn btn-primary btn-sm" on:click={loadKardex}>Filtrar</button>
        <button class="btn btn-secondary btn-sm" on:click={() => { filterInsumo=''; filterDesde=''; filterHasta=''; loadKardex(); }}>Limpiar</button>
      </div>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if entries.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Sin movimientos registrados</div>
        <div class="empty-state-text">No hay movimientos que coincidan con los filtros seleccionados.</div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="kardex-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">#</th>
              <th style="width: 150px;">Fecha y Hora</th>
              <th>Insumo / Producto</th>
              <th>Motivo / Referencia</th>
              <th style="text-align: right; width: 130px; color: var(--success);">📥 Entrada (+)</th>
              <th style="text-align: right; width: 130px; color: var(--danger);">📤 Salida (-)</th>
              <th style="text-align: right; width: 120px;">Saldo Final</th>
              <th style="width: 130px;">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {#each entries as e, idx (e.id)}
              <tr>
                <td class="text-muted text-xs text-center font-mono">#{e.id}</td>
                <td class="text-sm font-mono whitespace-nowrap">
                  {new Date(e.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <div class="font-medium text-sm">{e.insumos?.nombre ?? '—'}</div>
                  <div class="text-muted text-xs">Unidad: {e.insumos?.unidad ?? 'u'}</div>
                </td>
                <td class="text-sm text-muted">
                  {e.referencia || '—'}
                </td>
                <!-- ENTRADA -->
                <td style="text-align: right;">
                  {#if e.tipo === 'entrada'}
                    <span class="kardex-qty-badge entry">
                      +{Number(e.cantidad).toFixed(2)}
                    </span>
                  {:else}
                    <span class="text-muted text-xs">—</span>
                  {/if}
                </td>
                <!-- SALIDA -->
                <td style="text-align: right;">
                  {#if e.tipo === 'salida'}
                    <span class="kardex-qty-badge exit">
                      -{Number(e.cantidad).toFixed(2)}
                    </span>
                  {:else}
                    <span class="text-muted text-xs">—</span>
                  {/if}
                </td>
                <!-- SALDO RESULTANTE -->
                <td style="text-align: right;">
                  <span class="kardex-balance font-semibold">
                    {Number(e.saldo).toFixed(2)} <span class="text-muted text-xs">{e.insumos?.unidad ?? ''}</span>
                  </span>
                </td>
                <td class="text-sm">
                  <span class="user-pill">{e.usuarios?.nombre ?? 'Sistema'}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .kardex-table th {
    white-space: nowrap;
    padding: 12px 14px;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
  }
  .kardex-table td {
    padding: 12px 14px;
    vertical-align: middle;
  }
  .kardex-qty-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 700;
    font-family: monospace;
    letter-spacing: 0.02em;
  }
  .kardex-qty-badge.entry {
    background: rgba(16, 185, 129, 0.12);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.25);
  }
  .kardex-qty-badge.exit {
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    border: 1px solid rgba(239, 68, 68, 0.25);
  }
  .kardex-balance {
    font-size: 0.95rem;
    color: var(--text-primary);
  }
  .user-pill {
    display: inline-block;
    padding: 2px 8px;
    background: var(--bg-surface-alt);
    border-radius: 9999px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .whitespace-nowrap {
    white-space: nowrap;
  }
</style>

