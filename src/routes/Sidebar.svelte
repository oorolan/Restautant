<script lang="ts">
  import { session, currentRoute, isAdmin, isJefeAlmacen, notify } from '../lib/stores/session';
  import { configuracion } from '../lib/stores/configuracion';

  // SVG paths from Heroicons (outline, 24px)
  const icons: Record<string, string> = {
    almacen:       'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    kardex:        'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    ordenes:       'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
    recepciones:   'M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3',
    proveedores:   'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    categorias:    'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
    reportes:      'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    usuarios:      'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    configuracion: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    logo:          'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3',
    logout:        'M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15',
  };

  const navItems = [
    { id: 'almacen',       label: 'Almacén',          icon: 'almacen',       section: 'Principal' },
    { id: 'kardex',        label: 'Kardex',           icon: 'kardex',        section: 'Principal' },
    { id: 'ordenes',       label: 'Órdenes',          icon: 'ordenes',       section: 'Principal', jefeOnly: true },
    { id: 'recepciones',   label: 'Recepción',        icon: 'recepciones',   section: 'Principal', jefeOnly: true },
    { id: 'proveedores',   label: 'Proveedores',      icon: 'proveedores',   section: 'Gestión',   jefeOnly: true },
    { id: 'categorias',    label: 'Categorías',       icon: 'categorias',    section: 'Gestión',   adminOnly: true },
    { id: 'reportes',      label: 'Reportes',         icon: 'reportes',      section: 'Gestión',   jefeOnly: true },
    { id: 'usuarios',      label: 'Usuarios',         icon: 'usuarios',      section: 'Sistema',   adminOnly: true },
    { id: 'configuracion', label: 'Configuración',    icon: 'configuracion', section: 'Sistema',   adminOnly: true },
  ];

  $: filteredItems = navItems.filter(item => {
    if (item.adminOnly) return $isAdmin;
    if (item.jefeOnly) return $isJefeAlmacen;
    return true;
  });

  $: sections = [...new Set(filteredItems.map(i => i.section))];

  function navigate(route: string) {
    currentRoute.set(route);
  }

  function logout() {
    session.set({ usuario: null, loading: false, initialized: true });
    notify('info', 'Sesión cerrada correctamente');
  }

  $: user = $session.usuario;
  $: initials = user?.nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'U';
  $: rolLabel = user?.rol === 'admin' ? 'Administrador'
    : user?.rol === 'jefe_almacen' ? 'Jefe de Almacén'
    : 'Empleado';
</script>

<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="sidebar-logo-icon">
      <img src="/logo.png" alt="Logo" class="app-logo-img" />
    </div>
    <div class="sidebar-logo-text">
      <span class="app-name">{$configuracion.nombre_comercial || 'RestaurantStock'}</span>
      <span class="app-sub">{$configuracion.lema || 'Gestión de Inventario'}</span>
    </div>
  </div>

  <nav class="sidebar-nav">
    {#each sections as section}
      <div class="nav-section-label">{section}</div>
      {#each filteredItems.filter(i => i.section === section) as item}
        <button
          class="nav-item"
          class:active={$currentRoute === item.id}
          on:click={() => navigate(item.id)}
          id="nav-{item.id}"
          aria-label={item.label}
        >
          <span class="nav-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
            </svg>
          </span>
          <span>{item.label}</span>
        </button>
      {/each}
    {/each}
  </nav>

  <div class="sidebar-footer">
    <div class="user-card" role="button" tabindex="0" on:click={logout} on:keydown={(e) => e.key === 'Enter' && logout()} title="Cerrar sesión">
      <div class="user-avatar">{initials}</div>
      <div class="user-info">
        <div class="user-name">{user?.nombre ?? ''}</div>
        <div class="user-role">{rolLabel}</div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16" style="color: var(--text-muted); flex-shrink:0" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
      </svg>
    </div>
  </div>
</aside>
