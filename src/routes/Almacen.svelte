<script lang="ts">
  import { onMount } from 'svelte';
  import { session, isJefeAlmacen, notify } from '../lib/stores/session';
  import { getInsumos, createInsumo, updateInsumo, deleteInsumo, registrarSalida, type Insumo } from '../lib/api/insumos';
  import { getCategorias, type Categoria } from '../lib/api/categorias';
  import { getProveedores, type Proveedor } from '../lib/api/proveedores';
  import { exportToExcel } from '../lib/utils/excel';

  let insumos: Insumo[] = [];
  let categorias: Categoria[] = [];
  let proveedores: Proveedor[] = [];
  let loading = true;
  let search = '';
  let filterCategoria = '';

  // Modal states
  let showModal = false;
  let showSalidaModal = false;
  let editingInsumo: Insumo | null = null;
  let deletingId: number | null = null;

  // Form
  let form = { nombre: '', categoria_id: '', proveedor_id: '', unidad: '', stock_actual: 0, stock_minimo: 0, precio_unitario: 0 };

  // Salida form
  let salidaInsumo: Insumo | null = null;
  let salidaCantidad = 0;
  let salidaReferencia = '';

  onMount(async () => {
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    try {
      [insumos, categorias, proveedores] = await Promise.all([getInsumos(), getCategorias(), getProveedores()]);
    } catch (e: any) {
      notify('error', 'Error al cargar insumos: ' + e.message);
    } finally {
      loading = false;
    }
  }

  $: filtered = insumos.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategoria || String(i.categoria_id) === filterCategoria;
    return matchSearch && matchCat;
  });

  $: criticalCount = insumos.filter(i => i.stock_actual <= i.stock_minimo).length;

  function openCreate() {
    editingInsumo = null;
    form = { nombre: '', categoria_id: '', proveedor_id: '', unidad: '', stock_actual: 0, stock_minimo: 0, precio_unitario: 0 };
    showModal = true;
  }

  function openEdit(i: Insumo) {
    editingInsumo = i;
    form = { nombre: i.nombre, categoria_id: String(i.categoria_id ?? ''), proveedor_id: String(i.proveedor_id ?? ''), unidad: i.unidad, stock_actual: i.stock_actual, stock_minimo: i.stock_minimo, precio_unitario: i.precio_unitario };
    showModal = true;
  }

  function openSalida(i: Insumo) {
    salidaInsumo = i;
    salidaCantidad = 0;
    salidaReferencia = '';
    showSalidaModal = true;
  }

  async function handleSave() {
    if (!form.nombre || !form.unidad) { notify('warning', 'Nombre y unidad son requeridos'); return; }
    try {
      const payload = {
        nombre: form.nombre,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        unidad: form.unidad,
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        precio_unitario: Number(form.precio_unitario),
      };
      if (editingInsumo) {
        await updateInsumo(editingInsumo.id, payload);
        notify('success', 'Insumo actualizado');
      } else {
        await createInsumo(payload);
        notify('success', 'Insumo creado');
      }
      showModal = false;
      await loadAll();
    } catch (e: any) {
      notify('error', e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este insumo?')) return;
    try {
      await deleteInsumo(id);
      notify('success', 'Insumo eliminado');
      await loadAll();
    } catch (e: any) {
      notify('error', e.message);
    }
  }

  async function handleSalida() {
    if (!salidaInsumo || salidaCantidad <= 0) { notify('warning', 'Ingresa una cantidad válida'); return; }
    try {
      await registrarSalida(salidaInsumo.id, salidaCantidad, $session.usuario!.id, salidaReferencia || 'Salida manual');
      notify('success', `Salida registrada: ${salidaCantidad} ${salidaInsumo.unidad}`);
      showSalidaModal = false;
      await loadAll();
    } catch (e: any) {
      notify('error', e.message);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      notify('warning', 'No hay insumos para exportar');
      return;
    }
    const totalValor = filtered.reduce((acc, i) => acc + (i.stock_actual * i.precio_unitario), 0);
    exportToExcel({
      reportTitle: 'Control de Inventario y Stock de Insumos',
      sheetName: 'Inventario',
      fileNamePrefix: 'Inventario_Almacen',
      columns: [
        { header: '#', key: '#' },
        { header: 'Insumo / Producto', key: 'nombre' },
        { header: 'Categoría', key: 'categorias.nombre', format: (v) => v || 'Sin categoría' },
        { header: 'Proveedor Principal', key: 'proveedores.nombre', format: (v) => v || 'Sin asignar' },
        { header: 'Unidad', key: 'unidad' },
        { header: 'Stock Actual', key: 'stock_actual', format: (v) => Number(v || 0).toFixed(2) },
        { header: 'Stock Mínimo', key: 'stock_minimo', format: (v) => Number(v || 0).toFixed(2) },
        { header: 'Estado', key: 'stock_actual', format: (_, item) => item.stock_actual <= item.stock_minimo ? 'CRÍTICO' : item.stock_actual <= item.stock_minimo * 1.5 ? 'BAJO' : 'ÓPTIMO' },
        { header: 'Precio Unitario', key: 'precio_unitario', format: (v) => `$ ${Number(v || 0).toFixed(2)}` },
        { header: 'Valor Total', key: 'precio_unitario', format: (_, item) => `$ ${(item.stock_actual * item.precio_unitario).toFixed(2)}` }
      ],
      data: filtered,
      summaryCards: [
        { label: 'Total Insumos', value: filtered.length },
        { label: 'Insumos Críticos', value: criticalCount },
        { label: 'Valor Total Inventario', value: `$ ${totalValor.toFixed(2)}` }
      ]
    });
    notify('success', 'Reporte de Almacén exportado a Excel exitosamente');
  }

  function stockClass(i: Insumo) {
    if (i.stock_actual <= i.stock_minimo) return 'stock-critical';
    if (i.stock_actual <= i.stock_minimo * 1.5) return 'stock-warning';
    return '';
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Almacén</h1>
        <p class="page-subtitle">Gestión de insumos y stock en tiempo real</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-almacen-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar insumos a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isJefeAlmacen}
          <button id="btn-nuevo-insumo" class="btn btn-primary" on:click={openCreate}>
            + Nuevo insumo
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="page-body">
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon accent">📦</div>
        <div class="stat-body">
          <div class="stat-value">{insumos.length}</div>
          <div class="stat-label">Total insumos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon danger">🔴</div>
        <div class="stat-body">
          <div class="stat-value">{criticalCount}</div>
          <div class="stat-label">Stock crítico</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">✅</div>
        <div class="stat-body">
          <div class="stat-value">{insumos.length - criticalCount}</div>
          <div class="stat-label">Stock normal</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon info">🏷️</div>
        <div class="stat-body">
          <div class="stat-value">{categorias.length}</div>
          <div class="stat-label">Categorías</div>
        </div>
      </div>
    </div>

    {#if criticalCount > 0}
      <div class="alert alert-warning">
        ⚠️ <strong>{criticalCount} insumo{criticalCount > 1 ? 's' : ''}</strong> con stock en nivel crítico (igual o por debajo del mínimo).
      </div>
    {/if}

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-bar" style="flex: 1; max-width: 300px;">
          <span class="search-icon">🔍</span>
          <input id="search-insumos" class="form-control" type="text" placeholder="Buscar insumo..." bind:value={search} />
        </div>
        <select id="filter-categoria" class="form-control" style="width: 180px;" bind:value={filterCategoria}>
          <option value="">Todas las categorías</option>
          {#each categorias as cat}
            <option value={String(cat.id)}>{cat.nombre}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Table -->
    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">Sin insumos</div>
        <div class="empty-state-text">
          {search ? 'No se encontraron resultados para tu búsqueda.' : 'Comienza agregando tu primer insumo.'}
        </div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Categoría</th>
              <th>Proveedor</th>
              <th>Unidad</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Precio Unit.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as insumo (insumo.id)}
              <tr>
                <td>{insumo.nombre}</td>
                <td>{insumo.categorias?.nombre ?? '—'}</td>
                <td>{insumo.proveedores?.nombre ?? '—'}</td>
                <td>{insumo.unidad}</td>
                <td class={stockClass(insumo)}>
                  {insumo.stock_actual}
                  {#if insumo.stock_actual <= insumo.stock_minimo}
                    🔴
                  {:else if insumo.stock_actual <= insumo.stock_minimo * 1.5}
                    🟡
                  {/if}
                </td>
                <td>{insumo.stock_minimo}</td>
                <td>S/ {Number(insumo.precio_unitario).toFixed(2)}</td>
                <td>
                  {#if insumo.stock_actual <= insumo.stock_minimo}
                    <span class="badge badge-danger">Crítico</span>
                  {:else if insumo.stock_actual <= insumo.stock_minimo * 1.5}
                    <span class="badge badge-warning">Bajo</span>
                  {:else}
                    <span class="badge badge-success">Normal</span>
                  {/if}
                </td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-ghost btn-sm" title="Registrar salida" on:click={() => openSalida(insumo)}>📤 Salida</button>
                    {#if $isJefeAlmacen}
                      <button class="btn btn-secondary btn-sm" on:click={() => openEdit(insumo)}>✏️</button>
                      <button class="btn btn-danger btn-sm" on:click={() => handleDelete(insumo.id)}>🗑️</button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Crear/Editar -->
{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">{editingInsumo ? '✏️ Editar insumo' : '+ Nuevo insumo'}</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="form-nombre">Nombre *</label>
          <input id="form-nombre" class="form-control" bind:value={form.nombre} placeholder="Ej: Harina de trigo" />
        </div>
        <div class="form-group">
          <label class="form-label" for="form-unidad">Unidad *</label>
          <input id="form-unidad" class="form-control" bind:value={form.unidad} placeholder="kg, litros, unid." />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="form-categoria">Categoría</label>
          <select id="form-categoria" class="form-control" bind:value={form.categoria_id}>
            <option value="">Sin categoría</option>
            {#each categorias as cat}
              <option value={String(cat.id)}>{cat.nombre}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="form-proveedor">Proveedor</label>
          <select id="form-proveedor" class="form-control" bind:value={form.proveedor_id}>
            <option value="">Sin proveedor</option>
            {#each proveedores as p}
              <option value={String(p.id)}>{p.nombre}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="form-stock-actual">Stock Actual</label>
          <input id="form-stock-actual" class="form-control" type="number" min="0" step="0.01" bind:value={form.stock_actual} />
        </div>
        <div class="form-group">
          <label class="form-label" for="form-stock-minimo">Stock Mínimo</label>
          <input id="form-stock-minimo" class="form-control" type="number" min="0" step="0.01" bind:value={form.stock_minimo} />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="form-precio">Precio Unitario (S/)</label>
        <input id="form-precio" class="form-control" type="number" min="0" step="0.01" bind:value={form.precio_unitario} />
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button id="btn-save-insumo" class="btn btn-primary" on:click={handleSave}>
          {editingInsumo ? 'Guardar cambios' : 'Crear insumo'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Salida -->
{#if showSalidaModal && salidaInsumo}
  <div class="modal-overlay" role="presentation" on:click|self={() => showSalidaModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showSalidaModal = false)}>
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">📤 Registrar Salida</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showSalidaModal = false}>✕</button>
      </div>

      <div class="card" style="margin-bottom:16px; padding:14px;">
        <div class="text-sm text-muted">Insumo</div>
        <div class="font-semibold">{salidaInsumo.nombre}</div>
        <div class="text-sm text-muted" style="margin-top:4px;">
          Stock actual: <strong class={stockClass(salidaInsumo)}>{salidaInsumo.stock_actual} {salidaInsumo.unidad}</strong>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="salida-cantidad">Cantidad a retirar *</label>
        <input id="salida-cantidad" class="form-control" type="number" min="0.01" step="0.01" max={salidaInsumo.stock_actual} bind:value={salidaCantidad} />
      </div>

      <div class="form-group">
        <label class="form-label" for="salida-ref">Referencia / Motivo</label>
        <input id="salida-ref" class="form-control" bind:value={salidaReferencia} placeholder="Ej: Cocina 13/09, Merma, etc." />
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showSalidaModal = false}>Cancelar</button>
        <button id="btn-confirm-salida" class="btn btn-primary" on:click={handleSalida}>Confirmar salida</button>
      </div>
    </div>
  </div>
{/if}
