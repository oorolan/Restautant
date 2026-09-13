<script lang="ts">
  import { onMount } from 'svelte';
  import { session, isJefeAlmacen, notify } from '../lib/stores/session';
  import { getRecepciones, registrarRecepcion, type Recepcion } from '../lib/api/recepciones';
  import { getOrdenes, type Orden } from '../lib/api/ordenes';
  import { getInsumos, type Insumo } from '../lib/api/insumos';
  import { exportToExcel } from '../lib/utils/excel';

  let recepciones: Recepcion[] = [];
  let ordenesPendientes: Orden[] = [];
  let insumos: Insumo[] = [];
  let loading = true;
  let showModal = false;

  // Form state
  let modoRecepcion: 'orden' | 'directa' = 'orden';
  let selectedOrdenId = '';
  let fecha = new Date().toISOString().split('T')[0];
  let notas = '';
  let items: { insumo_id: number; nombre: string; unidad: string; cantidad: number }[] = [];

  onMount(async () => {
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    try {
      const [recs, ords, ins] = await Promise.all([
        getRecepciones(),
        getOrdenes(),
        getInsumos()
      ]);
      recepciones = recs;
      ordenesPendientes = ords.filter(o => o.estado === 'pendiente');
      insumos = ins;
    } catch (e: any) {
      notify('error', 'Error al cargar recepciones: ' + e.message);
    } finally {
      loading = false;
    }
  }

  function openModal() {
    modoRecepcion = ordenesPendientes.length > 0 ? 'orden' : 'directa';
    selectedOrdenId = '';
    fecha = new Date().toISOString().split('T')[0];
    notas = '';
    items = [{ insumo_id: insumos[0]?.id || 0, nombre: insumos[0]?.nombre || '', unidad: insumos[0]?.unidad || '', cantidad: 1 }];
    showModal = true;
  }

  function onSelectOrden() {
    if (!selectedOrdenId) {
      items = [];
      return;
    }
    const ord = ordenesPendientes.find(o => String(o.id) === selectedOrdenId);
    if (ord && ord.orden_detalle) {
      items = ord.orden_detalle.map(d => ({
        insumo_id: d.insumo_id,
        nombre: d.insumos?.nombre ?? `Insumo #${d.insumo_id}`,
        unidad: d.insumos?.unidad ?? '',
        cantidad: d.cantidad
      }));
      notas = `Recepción de Orden #${ord.id}`;
    }
  }

  function addDirectItem() {
    if (insumos.length === 0) return;
    items = [
      ...items,
      {
        insumo_id: insumos[0].id,
        nombre: insumos[0].nombre,
        unidad: insumos[0].unidad,
        cantidad: 1
      }
    ];
  }

  function removeDirectItem(index: number) {
    items = items.filter((_, idx) => idx !== index);
  }

  function onInsumoChange(index: number, idStr: string) {
    const found = insumos.find(i => String(i.id) === idStr);
    if (found) {
      items[index].insumo_id = found.id;
      items[index].nombre = found.nombre;
      items[index].unidad = found.unidad;
    }
  }

  async function handleConfirmar() {
    if (items.length === 0) {
      notify('warning', 'Debes incluir al menos un insumo en la recepción');
      return;
    }

    const invalidItem = items.find(i => !i.insumo_id || i.cantidad <= 0);
    if (invalidItem) {
      notify('warning', 'Todas las cantidades deben ser mayores a cero');
      return;
    }

    try {
      await registrarRecepcion({
        orden_id: modoRecepcion === 'orden' && selectedOrdenId ? Number(selectedOrdenId) : null,
        usuario_id: $session.usuario!.id,
        fecha,
        notas,
        items: items.map(i => ({
          insumo_id: i.insumo_id,
          cantidad_recibida: Number(i.cantidad)
        }))
      });

      notify('success', '¡Mercadería recibida y stock actualizado con éxito! 🎉');
      showModal = false;
      await loadAll();
    } catch (e: any) {
      notify('error', 'Error al registrar recepción: ' + e.message);
    }
  }

  function handleExportExcel() {
    if (recepciones.length === 0) {
      notify('warning', 'No hay recepciones registradas para exportar');
      return;
    }
    exportToExcel({
      reportTitle: 'Reporte de Recepciones de Mercadería e Ingresos a Almacén',
      sheetName: 'Recepciones',
      fileNamePrefix: 'Recepciones_Mercaderia',
      columns: [
        { header: '# Recepción', key: 'id', format: (v) => `#${v}` },
        { header: 'Fecha de Ingreso', key: 'fecha' },
        { header: 'Orden de Compra', key: 'orden_id', format: (v) => v ? `Orden #${v}` : 'Ingreso Directo' },
        { header: 'Proveedor', key: 'ordenes.proveedores.nombre', format: (v) => v || 'Directo / No especificado' },
        { header: 'Ítems Recibidos', key: 'recepcion_detalle', format: (v) => Array.isArray(v) ? v.length : 0 },
        { header: 'Observaciones / Notas', key: 'notas', format: (v) => v || '-' },
        { header: 'Recepcionado Por', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: recepciones,
      summaryCards: [
        { label: 'Total Recepciones', value: recepciones.length },
        { label: 'Órdenes Pendientes de Ingreso', value: pendientesCount }
      ]
    });
    notify('success', 'Recepciones exportadas a Excel exitosamente');
  }

  $: totalRecibido = recepciones.length;
  $: pendientesCount = ordenesPendientes.length;
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Recepción de Mercaderías</h1>
        <p class="page-subtitle">Ingreso de insumos al almacén e incremento automático de stock</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-recepciones-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar recepciones a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isJefeAlmacen}
          <button id="btn-nueva-recepcion" class="btn btn-primary" on:click={openModal}>
            + Registrar Recepción
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="page-body">
    <!-- Stats Banner -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon accent">📥</div>
        <div class="stat-body">
          <div class="stat-value">{totalRecibido}</div>
          <div class="stat-label">Total recepciones</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning">⏳</div>
        <div class="stat-body">
          <div class="stat-value">{pendientesCount}</div>
          <div class="stat-label">Órdenes pendientes</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">📦</div>
        <div class="stat-body">
          <div class="stat-value">{insumos.length}</div>
          <div class="stat-label">Insumos activos</div>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if recepciones.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-title">Sin recepciones registradas</div>
        <div class="empty-state-text">Registra la llegada de mercadería para sumar stock automáticamente.</div>
        {#if $isJefeAlmacen}
          <button class="btn btn-primary" style="margin-top:16px;" on:click={openModal}>
            + Registrar primera recepción
          </button>
        {/if}
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th># Recepción</th>
              <th>Fecha</th>
              <th>Orden Origen</th>
              <th>Ítems Recibidos</th>
              <th>Notas</th>
              <th>Recibido por</th>
            </tr>
          </thead>
          <tbody>
            {#each recepciones as r (r.id)}
              <tr>
                <td><strong class="text-accent">#{r.id}</strong></td>
                <td class="text-sm">{r.fecha}</td>
                <td>
                  {#if r.orden_id}
                    <span class="badge badge-info">Orden #{r.orden_id}</span>
                  {:else}
                    <span class="badge badge-neutral">Directa</span>
                  {/if}
                </td>
                <td>
                  {#if r.recepcion_detalle && r.recepcion_detalle.length > 0}
                    <div style="display:flex; flex-direction:column; gap:4px;">
                      {#each r.recepcion_detalle as item}
                        <span class="text-xs badge badge-neutral" style="justify-content:flex-start;">
                          • <strong>{item.cantidad_recibida}</strong> {item.insumos?.unidad ?? ''} &mdash; {item.insumos?.nombre ?? `Insumo #${item.insumo_id}`}
                        </span>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-muted text-xs">Sin detalle</span>
                  {/if}
                </td>
                <td class="text-sm text-muted truncate" style="max-width:200px;">
                  {r.notas || '—'}
                </td>
                <td class="text-sm">
                  {r.usuarios?.nombre ?? 'Sistema'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Registrar Recepción -->
{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" style="max-width: 650px;">
      <div class="modal-header">
        <h3 class="modal-title">📥 Registrar Recepción de Mercaderías</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <!-- Toggle Modo -->
      <div class="form-group">
        <label class="form-label">Tipo de Ingreso</label>
        <div style="display:flex; gap:12px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.9rem;">
            <input
              type="radio"
              bind:group={modoRecepcion}
              value="orden"
              on:change={() => { selectedOrdenId = ''; items = []; }}
            />
            Desde Orden de Compra Pendiente
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.9rem;">
            <input
              type="radio"
              bind:group={modoRecepcion}
              value="directa"
              on:change={() => {
                selectedOrdenId = '';
                items = [{ insumo_id: insumos[0]?.id || 0, nombre: insumos[0]?.nombre || '', unidad: insumos[0]?.unidad || '', cantidad: 1 }];
              }}
            />
            Recepción Directa / Sin Orden previa
          </label>
        </div>
      </div>

      {#if modoRecepcion === 'orden'}
        <div class="form-group">
          <label class="form-label" for="rec-orden">Seleccionar Orden Pendiente *</label>
          <select id="rec-orden" class="form-control" bind:value={selectedOrdenId} on:change={onSelectOrden}>
            <option value="">Selecciona una orden...</option>
            {#each ordenesPendientes as o}
              <option value={String(o.id)}>
                Orden #{o.id} &mdash; {o.proveedores?.nombre ?? 'Proveedor'} ({o.fecha})
              </option>
            {/each}
          </select>
          {#if ordenesPendientes.length === 0}
            <small class="text-muted" style="color:var(--warning);">No hay órdenes con estado 'pendiente'. Puedes usar 'Recepción Directa'.</small>
          {/if}
        </div>
      {/if}

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="rec-fecha">Fecha de Ingreso *</label>
          <input id="rec-fecha" class="form-control" type="date" bind:value={fecha} />
        </div>
        <div class="form-group">
          <label class="form-label" for="rec-notas">Notas / Remisión / Factura</label>
          <input id="rec-notas" class="form-control" bind:value={notas} placeholder="Ej: Remisión #4820, Factura 102" />
        </div>
      </div>

      <hr class="divider" />
      <div class="flex items-center justify-between" style="margin-bottom: 12px;">
        <h4 style="color: var(--text-secondary); margin:0;">Insumos y Cantidades Recibidas</h4>
        {#if modoRecepcion === 'directa'}
          <button class="btn btn-secondary btn-sm" on:click={addDirectItem}>+ Agregar insumo</button>
        {/if}
      </div>

      {#if items.length === 0}
        <div class="empty-state" style="padding:24px;">
          <p class="text-sm text-muted">Selecciona una orden o agrega insumos para continuar.</p>
        </div>
      {:else}
        <div style="display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto; padding-right:4px;">
          {#each items as item, idx}
            <div class="flex gap-2 items-center" style="background:var(--bg-card-hover); padding:8px 12px; border-radius:var(--radius-sm);">
              {#if modoRecepcion === 'directa'}
                <select
                  class="form-control"
                  style="flex:2;"
                  value={String(item.insumo_id)}
                  on:change={(e) => onInsumoChange(idx, e.currentTarget.value)}
                >
                  {#each insumos as ins}
                    <option value={String(ins.id)}>{ins.nombre} ({ins.unidad})</option>
                  {/each}
                </select>
              {:else}
                <div style="flex:2; font-size:0.9rem; font-weight:500;">
                  📦 {item.nombre}
                </div>
              {/if}

              <div class="flex items-center gap-1" style="width:150px;">
                <input
                  class="form-control"
                  type="number"
                  min="0.01"
                  step="0.01"
                  bind:value={item.cantidad}
                  placeholder="Cant."
                />
                <span class="text-xs text-muted" style="min-width:35px;">{item.unidad}</span>
              </div>

              {#if modoRecepcion === 'directa'}
                <button class="btn btn-danger btn-icon btn-sm" on:click={() => removeDirectItem(idx)}>✕</button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button
          id="btn-confirmar-recepcion"
          class="btn btn-primary"
          on:click={handleConfirmar}
          disabled={items.length === 0}
        >
          ✅ Confirmar Ingreso a Almacén
        </button>
      </div>
    </div>
  </div>
{/if}
