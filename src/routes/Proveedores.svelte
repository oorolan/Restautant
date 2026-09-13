<script lang="ts">
  import { onMount } from 'svelte';
  import { session, isJefeAlmacen, notify } from '../lib/stores/session';
  import { getProveedores, createProveedor, updateProveedor, deleteProveedor, type Proveedor } from '../lib/api/proveedores';
  import { exportToExcel } from '../lib/utils/excel';

  let proveedores: Proveedor[] = [];
  let loading = true;
  let search = '';
  let showModal = false;
  let editingId: number | null = null;

  let form = {
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: ''
  };

  onMount(async () => {
    await loadProveedores();
  });

  async function loadProveedores() {
    loading = true;
    try {
      proveedores = await getProveedores();
    } catch (e: any) {
      notify('error', 'Error al cargar proveedores: ' + e.message);
    } finally {
      loading = false;
    }
  }

  $: filtered = proveedores.filter(p => {
    const q = search.toLowerCase();
    return p.nombre.toLowerCase().includes(q) ||
           (p.contacto && p.contacto.toLowerCase().includes(q)) ||
           (p.telefono && p.telefono.includes(q)) ||
           (p.email && p.email.toLowerCase().includes(q));
  });

  function openCreate() {
    editingId = null;
    form = { nombre: '', contacto: '', telefono: '', email: '', direccion: '' };
    showModal = true;
  }

  function openEdit(p: Proveedor) {
    editingId = p.id;
    form = {
      nombre: p.nombre,
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || ''
    };
    showModal = true;
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      notify('warning', 'El nombre del proveedor es obligatorio');
      return;
    }

    try {
      if (editingId) {
        await updateProveedor(editingId, form);
        notify('success', 'Proveedor actualizado correctamente');
      } else {
        await createProveedor(form);
        notify('success', 'Proveedor creado exitosamente');
      }
      showModal = false;
      await loadProveedores();
    } catch (e: any) {
      notify('error', 'Error al guardar proveedor: ' + e.message);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${nombre}"?`)) return;
    try {
      await deleteProveedor(id);
      notify('success', 'Proveedor eliminado');
      await loadProveedores();
    } catch (e: any) {
      notify('error', 'No se pudo eliminar: ' + e.message);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      notify('warning', 'No hay proveedores para exportar');
      return;
    }
    exportToExcel({
      reportTitle: 'Directorio y Catálogo de Proveedores',
      sheetName: 'Proveedores',
      fileNamePrefix: 'Proveedores_Directorio',
      columns: [
        { header: '#', key: '#' },
        { header: 'Razón Social / Proveedor', key: 'nombre' },
        { header: 'Persona de Contacto', key: 'contacto', format: (v) => v || '-' },
        { header: 'Teléfono', key: 'telefono', format: (v) => v || '-' },
        { header: 'Correo Electrónico', key: 'email', format: (v) => v || '-' },
        { header: 'Dirección Comercial', key: 'direccion', format: (v) => v || '-' },
        { header: 'Fecha Registro', key: 'created_at', format: (v) => v ? new Date(v).toLocaleDateString('es-ES') : '-' }
      ],
      data: filtered,
      summaryCards: [
        { label: 'Total Proveedores Registrados', value: filtered.length },
        { label: 'Con Teléfono', value: filtered.filter(p => p.telefono).length },
        { label: 'Con Correo', value: filtered.filter(p => p.email).length }
      ]
    });
    notify('success', 'Catálogo de proveedores exportado a Excel exitosamente');
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Proveedores</h1>
        <p class="page-subtitle">Directorio comercial, contactos y datos de abastecimiento</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-proveedores-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar proveedores a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isJefeAlmacen}
          <button id="btn-nuevo-proveedor" class="btn btn-primary" on:click={openCreate}>
            + Nuevo Proveedor
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="page-body">
    <!-- Stats Banner -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value">{proveedores.length}</div>
          <div class="stat-label">Total proveedores</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value" style="color: var(--success);">{proveedores.filter(p => p.telefono).length}</div>
          <div class="stat-label">Con teléfono registrado</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-body">
          <div class="stat-value" style="color: var(--accent);">{proveedores.filter(p => p.email).length}</div>
          <div class="stat-label">Con correo electrónico</div>
        </div>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left" style="flex:1;">
        <input
          id="search-proveedor"
          type="search"
          class="form-control"
          placeholder="🔍 Buscar por nombre, contacto, teléfono..."
          bind:value={search}
          style="max-width: 360px;"
        />
      </div>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">🏭</div>
        <div class="empty-state-title">
          {search ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
        </div>
        <div class="empty-state-text">
          {search ? 'Intenta con otro término' : 'Agrega tu primer proveedor de insumos.'}
        </div>
        {#if !search && $isJefeAlmacen}
          <button class="btn btn-primary" style="margin-top:16px;" on:click={openCreate}>
            + Agregar Proveedor
          </button>
        {/if}
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Persona Contacto</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Dirección</th>
              {#if $isJefeAlmacen}<th>Acciones</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each filtered as p (p.id)}
              <tr>
                <td>
                  <strong>{p.nombre}</strong>
                </td>
                <td class="text-sm">{p.contacto || '—'}</td>
                <td class="text-sm">
                  {#if p.telefono}
                    <span class="badge badge-neutral">📞 {p.telefono}</span>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="text-sm">
                  {#if p.email}
                    <span class="badge badge-info">✉️ {p.email}</span>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="text-sm text-muted truncate" style="max-width: 180px;">
                  {p.direccion || '—'}
                </td>
                {#if $isJefeAlmacen}
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-secondary btn-sm"
                        on:click={() => openEdit(p)}
                        title="Editar proveedor"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        class="btn btn-danger btn-sm"
                        on:click={() => handleDelete(p.id, p.nombre)}
                        title="Eliminar proveedor"
                      >
                        🗑️
                      </button>
                    </div>
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

<!-- Modal Proveedor -->
{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" style="max-width: 550px;">
      <div class="modal-header">
        <h3 class="modal-title">{editingId ? '✏️ Editar Proveedor' : '🏭 Nuevo Proveedor'}</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <div class="form-group">
        <label class="form-label" for="prov-nombre">Nombre de la Empresa / Razón Social *</label>
        <input
          id="prov-nombre"
          class="form-control"
          placeholder="Ej: Distribuidora Avícola S.A."
          bind:value={form.nombre}
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="prov-contacto">Persona de Contacto</label>
          <input
            id="prov-contacto"
            class="form-control"
            placeholder="Ej: Carlos Mendoza"
            bind:value={form.contacto}
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="prov-telefono">Teléfono / WhatsApp</label>
          <input
            id="prov-telefono"
            class="form-control"
            placeholder="Ej: +51 987 654 321"
            bind:value={form.telefono}
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="prov-email">Correo Electrónico</label>
          <input
            id="prov-email"
            type="email"
            class="form-control"
            placeholder="ventas@proveedor.com"
            bind:value={form.email}
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="prov-direccion">Dirección</label>
          <input
            id="prov-direccion"
            class="form-control"
            placeholder="Ej: Av. Industrial 450"
            bind:value={form.direccion}
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button id="btn-guardar-proveedor" class="btn btn-primary" on:click={handleSave}>
          {editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
        </button>
      </div>
    </div>
  </div>
{/if}
