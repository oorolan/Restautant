<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { session, currentRoute, isAuthenticated, notifications } from '../lib/stores/session';
  import { initConfiguracion } from '../lib/stores/configuracion';

  import Login from './Login.svelte';
  import Sidebar from './Sidebar.svelte';
  import Almacen from './Almacen.svelte';
  import Kardex from './Kardex.svelte';
  import Ordenes from './Ordenes.svelte';
  import Recepciones from './Recepciones.svelte';
  import Proveedores from './Proveedores.svelte';
  import Categorias from './Categorias.svelte';
  import Usuarios from './Usuarios.svelte';
  import Reportes from './Reportes.svelte';
  import Configuracion from './Configuracion.svelte';
  import UpdateModal from '../lib/components/UpdateModal.svelte';

  onMount(() => {
    initConfiguracion();
  });
</script>

<UpdateModal />

{#if !$isAuthenticated}
  <Login />
{:else}
  <div class="layout">
    <Sidebar />
    <main class="main-content">
      {#if $currentRoute === 'almacen'}
        <Almacen />
      {:else if $currentRoute === 'kardex'}
        <Kardex />
      {:else if $currentRoute === 'ordenes'}
        <Ordenes />
      {:else if $currentRoute === 'recepciones'}
        <Recepciones />
      {:else if $currentRoute === 'proveedores'}
        <Proveedores />
      {:else if $currentRoute === 'categorias'}
        <Categorias />
      {:else if $currentRoute === 'usuarios'}
        <Usuarios />
      {:else if $currentRoute === 'reportes'}
        <Reportes />
      {:else if $currentRoute === 'configuracion'}
        <Configuracion />
      {/if}
    </main>
  </div>
{/if}

<!-- Notifications toast -->
<div class="toast-container">
  {#each $notifications as n (n.id)}
    <div class="toast toast-{n.type}" role="alert">
      <span class="toast-icon">
        {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      {n.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 9999;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 360px;
    backdrop-filter: blur(8px);
  }

  .toast-success { background: var(--success-bg); color: var(--success); border: 1px solid rgba(16,185,129,0.3); }
  .toast-error   { background: var(--danger-bg);  color: var(--danger);  border: 1px solid rgba(239,68,68,0.3); }
  .toast-warning { background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); }
  .toast-info    { background: var(--info-bg);    color: var(--info);    border: 1px solid rgba(59,130,246,0.3); }
</style>
