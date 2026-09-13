<script lang="ts">
  import { onMount } from 'svelte';
  import { session, isAdmin, notify, type Usuario } from '../lib/stores/session';
  import { getUsuarios, createUsuario, toggleUsuario, updateUsuario } from '../lib/api/auth';
  import { exportToExcel } from '../lib/utils/excel';

  let usuarios: Usuario[] = [];
  let loading = true;
  let search = '';
  let showModal = false;
  let showEditModal = false;
  let editingUser: Usuario | null = null;

  // New user form
  let form = {
    nombre: '',
    username: '',
    email: '',
    password: '',
    rol: 'empleado' as 'admin' | 'jefe_almacen' | 'empleado'
  };

  // Edit user form
  let editForm = {
    nombre: '',
    rol: 'empleado' as 'admin' | 'jefe_almacen' | 'empleado',
    activo: true
  };

  onMount(async () => {
    await loadUsuarios();
  });

  async function loadUsuarios() {
    loading = true;
    try {
      usuarios = await getUsuarios();
    } catch (e: any) {
      notify('error', 'Error al cargar usuarios: ' + e.message);
    } finally {
      loading = false;
    }
  }

  $: filtered = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.rol.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    form = { nombre: '', username: '', email: '', password: '', rol: 'empleado' };
    showModal = true;
  }

  function openEdit(u: Usuario) {
    editingUser = u;
    editForm = { nombre: u.nombre, rol: u.rol, activo: u.activo };
    showEditModal = true;
  }

  async function handleCreate() {
    if (!form.nombre.trim() || !form.username.trim() || !form.email.trim() || !form.password.trim()) {
      notify('warning', 'Todos los campos son obligatorios');
      return;
    }
    if (form.password.length < 4) {
      notify('warning', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      await createUsuario(form);
      notify('success', `Usuario ${form.nombre} creado correctamente`);
      showModal = false;
      await loadUsuarios();
    } catch (e: any) {
      notify('error', 'Error al crear usuario: ' + e.message);
    }
  }

  async function handleEdit() {
    if (!editingUser) return;
    try {
      await updateUsuario(editingUser.id, {
        nombre: editForm.nombre,
        rol: editForm.rol,
        activo: editForm.activo
      });
      notify('success', 'Usuario actualizado con éxito');
      showEditModal = false;
      await loadUsuarios();
    } catch (e: any) {
      notify('error', 'Error al actualizar usuario: ' + e.message);
    }
  }

  async function handleToggle(u: Usuario) {
    // Prevent deactivating own account
    if (u.id === $session.usuario?.id) {
      notify('warning', 'No puedes desactivar tu propia cuenta');
      return;
    }

    const nuevoEstado = !u.activo;
    try {
      await toggleUsuario(u.id, nuevoEstado);
      notify('info', `Usuario ${u.nombre} ${nuevoEstado ? 'activado' : 'desactivado'}`);
      await loadUsuarios();
    } catch (e: any) {
      notify('error', 'Error al cambiar estado: ' + e.message);
    }
  }

  function getRolBadge(rol: string) {
    switch (rol) {
      case 'admin': return 'badge-danger';
      case 'jefe_almacen': return 'badge-info';
      default: return 'badge-neutral';
    }
  }

  function getRolName(rol: string) {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'jefe_almacen': return 'Jefe de Almacén';
      default: return 'Empleado';
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      notify('warning', 'No hay usuarios para exportar');
      return;
    }
    exportToExcel({
      reportTitle: 'Padrón de Usuarios y Roles de Acceso',
      sheetName: 'Usuarios',
      fileNamePrefix: 'Usuarios_Sistema',
      columns: [
        { header: '#', key: '#' },
        { header: 'Nombre Completo', key: 'nombre' },
        { header: 'Nombre de Usuario', key: 'username', format: (v) => `@${v || ''}` },
        { header: 'Correo Electrónico', key: 'email' },
        { header: 'Rol en el Sistema', key: 'rol', format: (v) => getRolName(v) },
        { header: 'Estado', key: 'activo', format: (v) => v ? 'ACTIVO' : 'INACTIVO' },
        { header: 'Fecha Registro', key: 'created_at', format: (v) => v ? new Date(v).toLocaleDateString('es-ES') : '-' }
      ],
      data: filtered,
      summaryCards: [
        { label: 'Total Usuarios', value: filtered.length },
        { label: 'Usuarios Activos', value: filtered.filter(u => u.activo).length },
        { label: 'Usuarios Inactivos', value: filtered.filter(u => !u.activo).length }
      ]
    });
    notify('success', 'Lista de usuarios exportada a Excel exitosamente');
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Gestión de Usuarios</h1>
        <p class="page-subtitle">Control de accesos y roles del sistema</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-exportar-usuarios-excel" class="btn btn-excel" on:click={handleExportExcel} title="Exportar usuarios a Microsoft Excel (.xlsx)">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 15.5l-1.5-2.5-1.5 2.5H4.8l2.5-3.8-2.3-3.7h1.7l1.5 2.5 1.5-2.5h1.7l-2.3 3.7 2.5 3.8H9.5zM20 19h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V9h7v2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
        {#if $isAdmin}
          <button id="btn-nuevo-usuario" class="btn btn-primary" on:click={openCreate}>
            + Nuevo Usuario
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="page-body">
    <!-- Stats Banner -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon accent">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{usuarios.length}</div>
          <div class="stat-label">Total usuarios</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{usuarios.filter(u => u.activo).length}</div>
          <div class="stat-label">Usuarios activos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{usuarios.filter(u => u.rol === 'admin').length}</div>
          <div class="stat-label">Administradores</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{usuarios.filter(u => u.rol === 'jefe_almacen').length}</div>
          <div class="stat-label">Jefes de almacén</div>
        </div>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left" style="flex:1;">
        <input
          id="search-usuario"
          type="search"
          class="form-control"
          placeholder="Buscar por nombre, usuario o rol..."
          bind:value={search}
          style="max-width: 340px;"
        />
      </div>
    </div>

    {#if loading}
      <div class="empty-state"><span class="spinner" style="width:40px;height:40px;border-width:3px;"></span></div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" width="48" height="48"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
        </div>
        <div class="empty-state-title">
          {search ? 'Sin usuarios encontrados' : 'No hay usuarios registrados'}
        </div>
        <div class="empty-state-text">
          {search ? 'Intenta con otro término de búsqueda' : 'Registra usuarios para que puedan acceder al sistema.'}
        </div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario / Email</th>
              <th>Rol</th>
              <th>Estado</th>
              {#if $isAdmin}<th>Acciones</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each filtered as u (u.id)}
              <tr style={!u.activo ? 'opacity: 0.6;' : ''}>
                <td>
                  <div class="flex items-center gap-2">
                    <div
                      class="user-avatar"
                      style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--bg-card-hover);"
                    >
                      {u.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{u.nombre}</strong>
                      {#if u.id === $session.usuario?.id}
                        <span class="text-xs text-accent" style="margin-left:6px;">(Tú)</span>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="text-sm">
                  <div><strong>{u.username ?? '—'}</strong></div>
                  <div style="color: var(--text-muted); font-size: 0.78rem;">{u.email}</div>
                </td>
                <td>
                  <span class="badge {getRolBadge(u.rol)}">
                    {getRolName(u.rol)}
                  </span>
                </td>
                <td>
                  {#if u.activo}
                    <span class="badge badge-success">Activo</span>
                  {:else}
                    <span class="badge badge-neutral">Inactivo</span>
                  {/if}
                </td>
                {#if $isAdmin}
                  <td>
                    <div class="flex gap-2 items-center">
                      <button
                        class="btn btn-secondary btn-sm"
                        on:click={() => openEdit(u)}
                        title="Editar usuario"
                      >
                        Editar
                      </button>

                      {#if u.id !== $session.usuario?.id}
                        <button
                          class="btn btn-sm {u.activo ? 'btn-ghost' : 'btn-primary'}"
                          on:click={() => handleToggle(u)}
                          title={u.activo ? 'Desactivar acceso' : 'Activar acceso'}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      {/if}
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

<!-- Modal Nuevo Usuario -->
{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => showModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3 class="modal-title">Nuevo Usuario</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showModal = false}>✕</button>
      </div>

      <div class="form-group">
        <label class="form-label" for="user-nombre">Nombre y Apellido *</label>
        <input
          id="user-nombre"
          class="form-control"
          placeholder="Ej: Roberto Gómez"
          bind:value={form.nombre}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="user-username">Nombre de usuario *</label>
        <input
          id="user-username"
          class="form-control"
          placeholder="roberto"
          bind:value={form.username}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="user-email">Correo Electrónico *</label>
        <input
          id="user-email"
          type="email"
          class="form-control"
          placeholder="roberto@restaurante.com"
          bind:value={form.email}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="user-password">Contraseña Inicial *</label>
        <input
          id="user-password"
          type="password"
          class="form-control"
          placeholder="••••••••"
          bind:value={form.password}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="user-rol">Rol del Usuario *</label>
        <select id="user-rol" class="form-control" bind:value={form.rol}>
          <option value="empleado">Empleado (Registra salidas manuales, consulta stock)</option>
          <option value="jefe_almacen">Jefe de Almacén (Gestión completa de stock, órdenes y proveedores)</option>
          <option value="admin">Administrador (Acceso total, usuarios, categorías y reportes)</option>
        </select>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancelar</button>
        <button id="btn-crear-usuario" class="btn btn-primary" on:click={handleCreate}>
          Crear Usuario
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Editar Usuario -->
{#if showEditModal && editingUser}
  <div class="modal-overlay" role="presentation" on:click|self={() => showEditModal = false} on:keydown|self={(e) => e.key === 'Escape' && (showEditModal = false)}>
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3 class="modal-title">Editar Usuario</h3>
        <button class="btn btn-ghost btn-icon" on:click={() => showEditModal = false}>✕</button>
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-nombre">Nombre y Apellido</label>
        <input
          id="edit-nombre"
          class="form-control"
          bind:value={editForm.nombre}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-email">Correo Electrónico</label>
        <input
          id="edit-email"
          class="form-control"
          value={editingUser.email}
          disabled
          style="opacity:0.7;"
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-rol">Rol</label>
        <select id="edit-rol" class="form-control" bind:value={editForm.rol}>
          <option value="empleado">Empleado</option>
          <option value="jefe_almacen">Jefe de Almacén</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" bind:checked={editForm.activo} />
          <span>Cuenta activa (puede iniciar sesión)</span>
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showEditModal = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={handleEdit}>
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
{/if}
