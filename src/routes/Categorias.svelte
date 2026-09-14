<script lang="ts">
  import { onMount } from 'svelte';
  import { isJefeAlmacen, notify } from '../lib/stores/session';
  import { getCategorias, createCategoria, updateCategoria, deleteCategoria, type Categoria } from '../lib/api/categorias';
  import { exportToExcel } from '../lib/utils/excel';

  let categorias: Categoria[] = [];
  let loading = true;
  let search = '';
  let showModal = false;
  let editingId: number | null = null;

  let form = {
    nombre: '',
    descripcion: ''
  };

  onMount(async () => {
    await loadCategorias();
  });

  async function loadCategorias() {
    loading = true;
    try {
      categorias = await getCategorias();
    } catch (e: any) {
      notify('error', 'Error al cargar categorías: ' + e.message);
    } finally {
      loading = false;
    }
  }

  $: filtered = categorias.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.descripcion && c.descripcion.toLowerCase().includes(search.toLowerCase()))
  );

  function openCreate() {
    editingId = null;
    form = { nombre: '', descripcion: '' };
    showModal = true;
  }

  function openEdit(c: Categoria) {
    editingId = c.id;
    form = {
      nombre: c.nombre,
      descripcion: c.descripcion || ''
    };
    showModal = true;
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      notify('warning', 'El nombre de la categoría es obligatorio');
      return;
    }

    try {
      if (editingId) {
        await updateCategoria(editingId, form.nombre.trim(), form.descripcion.trim());
        notify('success', 'Categoría actualizada');
      } else {
        await createCategoria(form.nombre.trim(), form.descripcion.trim());
        notify('success', 'Categoría creada');
      }
      showModal = false;
      await loadCategorias();
    } catch (e: any) {
      notify('error', 'Error al guardar categoría: ' + e.message);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Los insumos asociados perderán su categoría.`)) return;
    try {
      await deleteCategoria(id);
      notify('success', 'Categoría eliminada');
      await loadCategorias();
    } catch (e: any) {
      notify('error', 'No se pudo eliminar: ' + e.message);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      notify('warning', 'No hay categorías para exportar');
      return;
    }
    exportToExcel({
      reportTitle: 'Catálogo de Categorías de Insumos',
      sheetName: 'Categorias',
      fileNamePrefix: 'Categorias_Insumos',
      columns: [
        { header: '#', key: '#' },
        { header: 'Nombre de la Categoría', key: 'nombre' },
        { header: 'Descripción / Rubro', key: 'descripcion', format: (v) => v || '-' }
      ],
      data: filtered,
      summaryCards: [
        { label: 'Total Categorías', value: filtered.length }
      ]
    });
    notify('success', 'Categorías exportadas a Excel exitosamente');
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Categorías de Insumos</h1>
        <p class="page-subtitle">Clasificación y rubros del inventario gastronómico</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-categorias-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar categorías a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isJefeAlmacen}
          <button id="btn-nueva-categoria" class="btn btn-primary" on:click={openCreate}>
            + Nueva Categoría
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
          <div class="stat-value">{categorias.length}</div>
          <div class="stat-label">Total categorías registradas</div>
        </div>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left" style="flex:1;">
        <input
          id="search-categoria"
          type="search"
          class="form-control"
          placeholder="🔍 Buscar categoría..."
          bind:value={search}
          style="max-width: 320px;"
        />
      </div>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">🏷️</div>
        <div class="empty-state-title">
          {search ? 'Sin coincidencias' : 'No hay categorías creadas'}
        </div>
        <div class="empty-state-text">
          {search ? 'Prueba con otro término' : 'Crea categorías para organizar tus insumos y filtrar reportes con facilidad.'}
        </div>
        {#if !search && $isJefeAlmacen}
          <button class="btn btn-primary" style="margin-top:16px;" on:click={openCreate}>
            + Crear primera categoría
          </button>
        {/if}
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">ID</th>
              <th>Nombre de Categoría</th>
              <th>Descripción</th>
              {#if $isJefeAlmacen}<th style="width: 150px;">Acciones</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each filtered as c (c.id)}
              <tr>
                <td class="text-muted text-xs">#{c.id}</td>
                <td>
                  <strong>{c.nombre}</strong>
                </td>
                <td class="text-sm text-muted">
                  {c.descripcion || 'Sin descripción'}
                </td>
                {#if $isJefeAlmacen}
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-secondary btn-sm"
                        on:click={() => openEdit(c)}
                        title="Editar categoría"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        class="btn btn-danger btn-sm"
                        on:click={() => handleDelete(c.id, c.nombre)}
                        title="Eliminar categoría"
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

<!-- Modal Categoría -->
{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">{editingId ? '✏️ Editar Categoría' : '🏷️ Nueva Categoría'}</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <div class="form-group">
        <label class="form-label" for="cat-nombre">Nombre de la Categoría *</label>
        <input
          id="cat-nombre"
          class="form-control"
          placeholder="Ej: Carnes y Embutidos, Lácteos, Abarrotes..."
          bind:value={form.nombre}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="cat-descripcion">Descripción / Notas</label>
        <textarea
          id="cat-descripcion"
          class="form-control"
          rows="3"
          placeholder="Ej: Insumos perecibles que requieren refrigeración a 4°C..."
          bind:value={form.descripcion}
        ></textarea>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button id="btn-guardar-categoria" class="btn btn-primary" on:click={handleSave}>
          {editingId ? 'Guardar Cambios' : 'Crear Categoría'}
        </button>
      </div>
    </div>
  </div>
{/if}
