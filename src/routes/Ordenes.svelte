<script lang="ts">
  import { onMount } from 'svelte';
  import { session, isJefeAlmacen, notify } from '../lib/stores/session';
  import { getOrdenes, createOrden, cancelarOrden, type Orden } from '../lib/api/ordenes';
  import { getProveedores, type Proveedor } from '../lib/api/proveedores';
  import { getInsumos, type Insumo } from '../lib/api/insumos';
  import { exportToExcel } from '../lib/utils/excel';

  let ordenes: Orden[] = [];
  let proveedores: Proveedor[] = [];
  let insumos: Insumo[] = [];
  let loading = true;
  let showModal = false;

  // Form
  let form = { proveedor_id: '', fecha: new Date().toISOString().split('T')[0], notas: '' };
  let items: { insumo_id: string; cantidad: number; precio_unitario: number }[] = [{ insumo_id: '', cantidad: 1, precio_unitario: 0 }];

  onMount(async () => {
    loading = true;
    try {
      [ordenes, proveedores, insumos] = await Promise.all([getOrdenes(), getProveedores(), getInsumos()]);
    } catch (e: any) { notify('error', e.message); }
    finally { loading = false; }
  });

  async function reload() {
    ordenes = await getOrdenes();
  }

  function addItem() { items = [...items, { insumo_id: '', cantidad: 1, precio_unitario: 0 }]; }
  function removeItem(i: number) { items = items.filter((_, idx) => idx !== i); }

  async function handleCreate() {
    if (!form.proveedor_id) { notify('warning', 'Selecciona un proveedor'); return; }
    const validItems = items.filter(i => i.insumo_id && i.cantidad > 0);
    if (validItems.length === 0) { notify('warning', 'Agrega al menos un insumo'); return; }
    try {
      await createOrden({
        proveedor_id: Number(form.proveedor_id),
        usuario_id: $session.usuario!.id,
        fecha: form.fecha,
        notas: form.notas,
        items: validItems.map(i => ({ insumo_id: Number(i.insumo_id), cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
      });
      notify('success', 'Orden creada correctamente');
      showModal = false;
      await reload();
    } catch (e: any) { notify('error', e.message); }
  }

  async function handleCancelar(id: number) {
    if (!confirm('¿Cancelar esta orden?')) return;
    try {
      await cancelarOrden(id);
      notify('success', 'Orden cancelada');
      await reload();
    } catch (e: any) { notify('error', e.message); }
  }

  function handleExportExcel() {
    if (ordenes.length === 0) {
      notify('warning', 'No hay órdenes de compra para exportar');
      return;
    }
    exportToExcel({
      reportTitle: 'Reporte de Órdenes de Compra a Proveedores',
      sheetName: 'Ordenes',
      fileNamePrefix: 'Ordenes_Compra',
      columns: [
        { header: '# Orden', key: 'id', format: (v) => `#${v}` },
        { header: 'Fecha Emisión', key: 'fecha' },
        { header: 'Proveedor', key: 'proveedores.nombre', format: (v) => v || 'Sin proveedor' },
        { header: 'Estado', key: 'estado', format: (v) => String(v || '').toUpperCase() },
        { header: 'Cantidad de Ítems', key: 'orden_detalle', format: (v) => Array.isArray(v) ? v.length : 0 },
        { header: 'Observaciones / Notas', key: 'notas', format: (v) => v || '-' },
        { header: 'Elaborado Por', key: 'usuarios.nombre', format: (v) => v || 'Sistema' }
      ],
      data: ordenes,
      summaryCards: [
        { label: 'Total Órdenes', value: ordenes.length },
        { label: 'Órdenes Pendientes', value: ordenes.filter(o => o.estado === 'pendiente').length },
        { label: 'Órdenes Recibidas', value: ordenes.filter(o => o.estado === 'recibido').length }
      ]
    });
    notify('success', 'Órdenes de compra exportadas a Excel exitosamente');
  }

  function estadoBadge(estado: string) {
    if (estado === 'pendiente') return 'badge-warning';
    if (estado === 'recibido')  return 'badge-success';
    return 'badge-neutral';
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Órdenes de Compra</h1>
        <p class="page-subtitle">Gestión y control de pedidos a proveedores</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-ordenes-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar órdenes a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isJefeAlmacen}
          <button id="btn-nueva-orden" class="btn btn-primary" on:click={() => showModal = true}>+ Nueva orden</button>
        {/if}
      </div>
    </div>
  </div>

  <div class="page-body">
    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if ordenes.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-title">Sin órdenes</div>
        <div class="empty-state-text">Crea tu primera orden de compra.</div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Ítems</th>
              <th>Notas</th>
              <th>Creado por</th>
              {#if $isJefeAlmacen}<th>Acciones</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each ordenes as o (o.id)}
              <tr>
                <td class="text-muted text-xs">#{o.id}</td>
                <td>{o.fecha}</td>
                <td>{o.proveedores?.nombre ?? '—'}</td>
                <td><span class="badge {estadoBadge(o.estado)}">{o.estado}</span></td>
                <td>{o.orden_detalle?.length ?? 0} ítem(s)</td>
                <td class="text-sm text-muted truncate" style="max-width:160px;">{o.notas || '—'}</td>
                <td class="text-sm">{o.usuarios?.nombre ?? '—'}</td>
                {#if $isJefeAlmacen}
                  <td>
                    {#if o.estado === 'pendiente'}
                      <button class="btn btn-danger btn-sm" on:click={() => handleCancelar(o.id)}>Cancelar</button>
                    {/if}
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" style="max-width: 620px;">
      <div class="modal-header">
        <h3 class="modal-title">🛒 Nueva Orden</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="orden-proveedor">Proveedor *</label>
          <select id="orden-proveedor" class="form-control" bind:value={form.proveedor_id}>
            <option value="">Seleccionar...</option>
            {#each proveedores as p}
              <option value={String(p.id)}>{p.nombre}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="orden-fecha">Fecha *</label>
          <input id="orden-fecha" class="form-control" type="date" bind:value={form.fecha} />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="orden-notas">Notas</label>
        <input id="orden-notas" class="form-control" bind:value={form.notas} placeholder="Observaciones opcionales..." />
      </div>

      <hr class="divider" />
      <h4 style="margin-bottom:12px; color: var(--text-secondary);">Ítems del pedido</h4>

      {#each items as item, idx}
        <div class="flex gap-2 items-center" style="margin-bottom: 10px;">
          <select class="form-control" bind:value={item.insumo_id} style="flex: 2;">
            <option value="">Insumo...</option>
            {#each insumos as i}
              <option value={String(i.id)}>{i.nombre} ({i.unidad})</option>
            {/each}
          </select>
          <input class="form-control" type="number" placeholder="Cant." min="0.01" step="0.01" bind:value={item.cantidad} style="width: 90px;" />
          <input class="form-control" type="number" placeholder="Precio" min="0" step="0.01" bind:value={item.precio_unitario} style="width: 90px;" />
          <button class="btn btn-danger btn-icon btn-sm" on:click={() => removeItem(idx)} disabled={items.length === 1}>✕</button>
        </div>
      {/each}

      <button class="btn btn-secondary btn-sm" on:click={addItem} style="margin-top:4px;">+ Agregar ítem</button>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button id="btn-crear-orden" class="btn btn-primary" on:click={handleCreate}>Crear orden</button>
      </div>
    </div>
  </div>
{/if}
