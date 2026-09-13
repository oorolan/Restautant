<script lang="ts">
  import { session, notify } from '../lib/stores/session';
  import { login } from '../lib/api/auth';

  let username = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    if (!username || !password) { error = 'Completa todos los campos'; return; }
    loading = true;
    error = '';
    try {
      const usuario = await login(username, password);
      session.set({ usuario, loading: false, initialized: true });
      notify('success', `Bienvenido, ${usuario.nombre}`);
    } catch (e: any) {
      error = e.message ?? 'Error al iniciar sesión';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }
</script>

<div class="login-page">
  <div class="login-bg-glow"></div>

  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-icon">
        <img src="/logo.png" alt="Logo" class="app-logo-img" />
      </div>
      <div class="login-logo-text">
        <h1>RestaurantStock</h1>
        <p>Gestión de Inventario</p>
      </div>
    </div>

    {#if error}
      <div class="alert alert-danger" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16" style="flex-shrink:0">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        {error}
      </div>
    {/if}

    <div class="form-group">
      <label class="form-label" for="login-username">Usuario</label>
      <input
        id="login-username"
        class="form-control"
        type="text"
        placeholder="tu usuario"
        bind:value={username}
        on:keydown={handleKeydown}
        autocomplete="username"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="login-password">Contraseña</label>
      <input
        id="login-password"
        class="form-control"
        type="password"
        placeholder="••••••••"
        bind:value={password}
        on:keydown={handleKeydown}
        autocomplete="current-password"
        disabled={loading}
      />
    </div>

    <button
      id="btn-login"
      class="btn btn-primary w-full"
      style="margin-top: 8px; justify-content: center;"
      on:click={handleLogin}
      disabled={loading}
    >
      {#if loading}
        <span class="spinner"></span>
        Verificando...
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
        </svg>
        Ingresar
      {/if}
    </button>

    <p class="text-center text-xs text-muted" style="margin-top: 20px;">
      RestaurantStock v1.0
    </p>
  </div>
</div>
