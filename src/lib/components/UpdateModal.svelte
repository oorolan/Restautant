<script lang="ts">
  import { onMount } from 'svelte';
  import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
  import { notify } from '../stores/session';

  let showModal = false;
  let updateObj: Update | null = null;
  let newVersion = '';
  let releaseNotes = '';
  let isUpdating = false;
  let progressPct = 0;
  let statusText = '';

  onMount(() => {
    // Esperar 2.5 segundos tras abrir para no interferir con la carga inicial
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 2500);

    return () => clearTimeout(timer);
  });

  export async function checkForUpdates(manual = true) {
    // Verificar si estamos ejecutándonos dentro de Tauri
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      if (manual) notify('info', 'La búsqueda de actualizaciones automáticas solo está activa en la aplicación de escritorio (.exe)');
      return;
    }

    try {
      if (manual) statusText = 'Buscando actualizaciones en GitHub...';
      const update = await check();
      if (update) {
        updateObj = update;
        newVersion = update.version;
        releaseNotes = update.body || 'Esta actualización incluye mejoras de rendimiento, reportes en Excel y optimizaciones generales.';
        showModal = true;
      } else {
        if (manual) {
          notify('success', '¡Ya tienes instalada la versión más reciente de RestaurantStock!');
        }
      }
    } catch (err: any) {
      console.warn('Error verificando actualizaciones:', err);
      if (manual) {
        notify('error', 'No se pudo verificar actualizaciones: ' + (err?.message || 'Verifica tu conexión a internet'));
      }
    }
  }

  async function handleUpdateAndInstall() {
    if (!updateObj) return;
    isUpdating = true;
    progressPct = 0;
    statusText = 'Iniciando descarga de la actualización...';

    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      await updateObj.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength || 0;
          statusText = 'Descargando paquete de actualización...';
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            progressPct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            statusText = `Descargando: ${progressPct}% (${(downloadedBytes / 1048576).toFixed(1)} MB de ${(totalBytes / 1048576).toFixed(1)} MB)`;
          } else {
            statusText = `Descargando: ${(downloadedBytes / 1048576).toFixed(1)} MB...`;
          }
        } else if (event.event === 'Finished') {
          progressPct = 100;
          statusText = 'Instalando y reiniciando RestaurantStock...';
        }
      });
      notify('success', '¡Actualización completada! Reiniciando la aplicación...');
    } catch (e: any) {
      isUpdating = false;
      notify('error', 'Error al instalar actualización: ' + (e?.message || 'Inténtalo de nuevo más tarde'));
    }
  }
</script>

{#if showModal}
  <div class="modal-overlay" role="presentation" on:click|self={() => { if (!isUpdating) showModal = false; }} on:keydown|self={(e) => e.key === 'Escape' && !isUpdating && (showModal = false)}>
    <div class="modal update-modal" style="max-width: 500px;">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <div class="update-pulse-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <h3 class="modal-title" style="margin:0;">¡Nueva Versión Disponible!</h3>
            <span class="badge badge-accent" style="margin-top:2px;">Versión v{newVersion}</span>
          </div>
        </div>
        {#if !isUpdating}
          <button class="btn btn-ghost btn-icon" on:click={() => showModal = false} title="Cerrar">✕</button>
        {/if}
      </div>

      <div class="modal-body" style="padding: 16px 20px;">
        <p class="text-sm text-secondary" style="margin-bottom: 12px;">
          Hay una nueva versión oficial de <strong>RestaurantStock</strong> lista para instalarse.
        </p>

        {#if releaseNotes}
          <div class="release-notes-box">
            <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Novedades de esta versión:</div>
            <div class="text-sm text-primary" style="white-space: pre-wrap; max-height: 140px; overflow-y: auto;">
              {releaseNotes}
            </div>
          </div>
        {/if}

        {#if isUpdating}
          <div class="update-progress-section" style="margin-top: 18px;">
            <div class="flex justify-between text-xs mb-1">
              <span class="font-medium text-primary">{statusText}</span>
              {#if progressPct > 0}<span class="font-bold text-accent">{progressPct}%</span>{/if}
            </div>
            <div class="progress-track" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div class="progress-fill" style="width: {progressPct}%; height: 100%; background: var(--accent); transition: width 0.2s ease;"></div>
            </div>
            <p class="text-xs text-muted" style="margin-top: 8px; text-align: center;">
              Por favor no cierres la aplicación mientras se completa la instalación.
            </p>
          </div>
        {/if}
      </div>

      <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px;">
        {#if !isUpdating}
          <button class="btn btn-secondary" on:click={() => showModal = false}>
            Recordar más tarde
          </button>
          <button id="btn-instalar-actualizacion" class="btn btn-primary" on:click={handleUpdateAndInstall}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Actualizar e Instalar Ahora
          </button>
        {:else}
          <button class="btn btn-secondary" disabled>
            <span class="spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:6px;"></span>
            Instalando...
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .update-pulse-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(226, 179, 75, 0.15);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .release-notes-box {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
  }
</style>
