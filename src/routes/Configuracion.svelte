<script lang="ts">
  import { onMount } from 'svelte';
  import { configuracion, updateConfiguracion, configLoading } from '../lib/stores/configuracion';
  import { notify, isAdmin } from '../lib/stores/session';
  import { CONFIG_DEFAULT, type ConfiguracionRestaurante } from '../lib/api/configuracion';

  let form: ConfiguracionRestaurante = { ...CONFIG_DEFAULT };
  let isSaving = false;
  let formInitialized = false;

  // SVG Icons (Heroicons 24px outline)
  const icons = {
    building: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5v-.75a.75.75 0 00-.75-.75h-9a.75.75 0 00-.75.75v.75m10.5 0h-10.5',
    currency: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    check: 'M4.5 12.75l6 6 9-13.5',
    reset: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
  };

  onMount(() => {
    // Sincronizar formulario con el store solo en el primer cargado
    form = { ...$configuracion };
    formInitialized = true;
  });

  // Solo sincronizar si cambia desde afuera Y el form aún no fue inicializado
  $: if (!formInitialized && $configuracion) {
    form = { ...$configuracion };
  }

  async function handleSave() {
    if (!form.nombre_comercial.trim()) {
      notify('error', 'El nombre del restaurante es obligatorio');
      return;
    }

    isSaving = true;
    try {
      await updateConfiguracion(form);
      notify('success', 'Configuración del restaurante actualizada correctamente');
    } catch (e: any) {
      notify('error', 'Error al guardar la configuración: ' + (e?.message || ''));
    } finally {
      isSaving = false;
    }
  }

  function handleReset() {
    if (confirm('¿Restablecer los valores de configuración por defecto?')) {
      form = { ...CONFIG_DEFAULT };
      handleSave();
    }
  }
</script>

<div class="page-enter">
  <div class="page-header">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="page-title">Configuración del Sistema</h1>
        <p class="page-subtitle">Personaliza la identidad del restaurante, moneda oficial y datos para reportes</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          on:click={handleReset}
          disabled={isSaving}
          title="Restaurar valores de muestra"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d={icons.reset} />
          </svg>
          Restablecer
        </button>
        <button
          type="button"
          class="btn btn-primary"
          on:click={handleSave}
          disabled={isSaving}
        >
          {#if isSaving}
            <span class="spinner" style="width:16px; height:16px; border-width:2px;"></span>
            Guardando...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
            </svg>
            Guardar Configuración
          {/if}
        </button>
      </div>
    </div>
  </div>

  <div class="page-body">
    <div class="config-grid">
      <!-- Columna Izquierda: Formularios -->
      <div class="forms-column">
        <!-- Tarjeta 1: Identidad del Restaurante -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon-title">
              <div class="card-badge-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" d={icons.building} />
                </svg>
              </div>
              <div>
                <h3 class="card-title">Datos del Restaurante</h3>
                <p class="card-desc">Información legal y comercial que aparecerá en encabezados y reportes</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group flex-1">
                <label for="nombre_comercial" class="form-label">Nombre Comercial *</label>
                <input
                  id="nombre_comercial"
                  type="text"
                  class="form-control"
                  placeholder="Ej. La Trattoria Gourmet"
                  bind:value={form.nombre_comercial}
                  required
                />
              </div>
              <div class="form-group flex-1">
                <label for="razon_social" class="form-label">Razón Social Legal</label>
                <input
                  id="razon_social"
                  type="text"
                  class="form-control"
                  placeholder="Ej. Gastronomía & Servicios S.A.C."
                  bind:value={form.razon_social}
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="identificacion_fiscal" class="form-label">Identificación Fiscal (RUC / NIT / CIF)</label>
                <input
                  id="identificacion_fiscal"
                  type="text"
                  class="form-control"
                  placeholder="Ej. 20608945123"
                  bind:value={form.identificacion_fiscal}
                />
              </div>
              <div class="form-group flex-1">
                <label for="telefono" class="form-label">Teléfono / Celular / WhatsApp</label>
                <input
                  id="telefono"
                  type="text"
                  class="form-control"
                  placeholder="Ej. +51 987 654 321"
                  bind:value={form.telefono}
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="email" class="form-label">Correo Electrónico Oficial</label>
                <input
                  id="email"
                  type="email"
                  class="form-control"
                  placeholder="Ej. contacto@mirestaurante.com"
                  bind:value={form.email}
                />
              </div>
              <div class="form-group flex-1">
                <label for="sitio_web" class="form-label">Sitio Web / Red Social</label>
                <input
                  id="sitio_web"
                  type="text"
                  class="form-control"
                  placeholder="Ej. www.mirestaurante.com"
                  bind:value={form.sitio_web}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="direccion" class="form-label">Dirección del Establecimiento</label>
              <input
                id="direccion"
                type="text"
                class="form-control"
                placeholder="Ej. Av. Mariscal La Mar 1120, Miraflores, Lima"
                bind:value={form.direccion}
              />
            </div>
          </div>
        </div>

        <!-- Tarjeta 2: Parámetros Financieros y Operativos -->
        <div class="card mt-4">
          <div class="card-header">
            <div class="card-icon-title">
              <div class="card-badge-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" d={icons.currency} />
                </svg>
              </div>
              <div>
                <h3 class="card-title">Parámetros Operativos y Moneda</h3>
                <p class="card-desc">Configura la moneda de cálculo, impuestos y eslogan</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group" style="width: 140px;">
                <label for="moneda_simbolo" class="form-label">Símbolo Moneda</label>
                <input
                  id="moneda_simbolo"
                  type="text"
                  class="form-control"
                  placeholder="$"
                  maxlength="5"
                  bind:value={form.moneda_simbolo}
                />
              </div>
              <div class="form-group flex-1">
                <label for="moneda_codigo" class="form-label">Código ISO Moneda</label>
                <select id="moneda_codigo" class="form-control" bind:value={form.moneda_codigo}>
                  <option value="USD">USD ($) - Dólar Estadounidense</option>
                  <option value="PEN">PEN (S/.) - Sol Peruano</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="MXN">MXN ($) - Peso Mexicano</option>
                  <option value="COP">COP ($) - Peso Colombiano</option>
                  <option value="CLP">CLP ($) - Peso Chileno</option>
                  <option value="ARS">ARS ($) - Peso Argentino</option>
                </select>
              </div>
              <div class="form-group" style="width: 150px;">
                <label for="impuesto_porcentaje" class="form-label">Impuesto / IVA %</label>
                <input
                  id="impuesto_porcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="form-control"
                  bind:value={form.impuesto_porcentaje}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="lema" class="form-label">Lema o Eslogan</label>
              <input
                id="lema"
                type="text"
                class="form-control"
                placeholder="Ej. Pasión por el buen sabor"
                bind:value={form.lema}
              />
            </div>
          </div>
        </div>

        <!-- Tarjeta 3: Configuración de Reportes e Impresión -->
        <div class="card mt-4">
          <div class="card-header">
            <div class="card-icon-title">
              <div class="card-badge-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" d={icons.document} />
                </svg>
              </div>
              <div>
                <h3 class="card-title">Documentos y Reportes Impresos</h3>
                <p class="card-desc">Pie de página legal para auditorías y exportaciones</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="pie_reportes" class="form-label">Nota o Pie de Página de Reportes</label>
              <textarea
                id="pie_reportes"
                class="form-control"
                rows="3"
                placeholder="Ej. Documento confidencial de control de stock para uso interno."
                bind:value={form.pie_reportes}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Vista Previa en Vivo -->
      <div class="preview-column">
        <div class="card preview-card">
          <div class="preview-card-header">
            <span class="preview-tag">Vista Previa de Membrete</span>
            <span class="text-xs text-muted">Así saldrán tus reportes y PDF</span>
          </div>

          <div class="mock-letterhead">
            <div class="mock-top">
              <div class="mock-brand">
                <div class="mock-logo-box">
                  {form.nombre_comercial ? form.nombre_comercial.substring(0, 2).toUpperCase() : 'RS'}
                </div>
                <div>
                  <h4 class="mock-restaurant-name">{form.nombre_comercial || 'Nombre del Restaurante'}</h4>
                  {#if form.lema}
                    <div class="mock-slogan">{form.lema}</div>
                  {/if}
                  {#if form.razon_social}
                    <div class="mock-legal">{form.razon_social}</div>
                  {/if}
                </div>
              </div>
              <div class="mock-meta">
                {#if form.identificacion_fiscal}
                  <div><strong>ID Fiscal:</strong> {form.identificacion_fiscal}</div>
                {/if}
                <div><strong>Moneda:</strong> {form.moneda_simbolo} ({form.moneda_codigo})</div>
                <div><strong>Impuesto:</strong> {form.impuesto_porcentaje}%</div>
              </div>
            </div>

            <div class="mock-contact-bar">
              {#if form.direccion}
                <span>📍 {form.direccion}</span>
              {/if}
              {#if form.telefono}
                <span>📞 {form.telefono}</span>
              {/if}
              {#if form.email}
                <span>✉️ {form.email}</span>
              {/if}
            </div>

            <div class="mock-divider"></div>

            <div class="mock-report-sample">
              <div class="mock-report-title">REPORTE OFICIAL DE INVENTARIO Y MOVIMIENTOS</div>
              <div class="mock-table-sample">
                <div class="mock-table-header">
                  <span>Insumo</span>
                  <span>Categoría</span>
                  <span>Stock</span>
                  <span>Valorizado</span>
                </div>
                <div class="mock-table-row">
                  <span>Lomo Fino Res</span>
                  <span>Carnes</span>
                  <span>24.5 kg</span>
                  <span>{form.moneda_simbolo} 1,176.00</span>
                </div>
                <div class="mock-table-row">
                  <span>Mozzarella</span>
                  <span>Lácteos</span>
                  <span>6.0 kg</span>
                  <span>{form.moneda_simbolo} 156.00</span>
                </div>
              </div>
            </div>

            <div class="mock-footer">
              <p>{form.pie_reportes || 'Documento interno de inventario.'}</p>
              <div class="mock-signatures">
                <div class="mock-signature-line">Firma Administración</div>
                <div class="mock-signature-line">Firma Jefe Almacén</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .config-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 1024px) {
    .config-grid {
      grid-template-columns: 1fr;
    }
  }

  .card-icon-title {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .card-badge-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--accent-bg);
    border: 1px solid var(--border-accent);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .preview-card {
    background: #0f1219;
    border: 1px solid var(--border);
    position: sticky;
    top: 20px;
  }

  .preview-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .preview-tag {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-bg);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-accent);
  }

  /* Mock sheet */
  .mock-letterhead {
    background: #ffffff;
    color: #1e293b;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-size: 0.8125rem;
  }

  .mock-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .mock-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mock-logo-box {
    width: 44px;
    height: 44px;
    background: #f59e0b;
    color: #ffffff;
    font-weight: 800;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    letter-spacing: 1px;
  }

  .mock-restaurant-name {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }

  .mock-slogan {
    font-size: 0.75rem;
    font-style: italic;
    color: #d97706;
  }

  .mock-legal {
    font-size: 0.75rem;
    color: #64748b;
  }

  .mock-meta {
    text-align: right;
    font-size: 0.75rem;
    color: #475569;
    line-height: 1.4;
  }

  .mock-contact-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.75rem;
    color: #475569;
    margin-top: 14px;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 4px;
    border-left: 3px solid #f59e0b;
  }

  .mock-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 14px 0;
  }

  .mock-report-sample {
    margin-top: 10px;
  }

  .mock-report-title {
    font-weight: 700;
    font-size: 0.8125rem;
    color: #334155;
    text-align: center;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .mock-table-sample {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    font-size: 0.75rem;
  }

  .mock-table-header {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr 1.5fr;
    background: #f1f5f9;
    padding: 6px 10px;
    font-weight: 700;
    color: #475569;
  }

  .mock-table-row {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr 1.5fr;
    padding: 6px 10px;
    border-top: 1px solid #f1f5f9;
    color: #1e293b;
  }

  .mock-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    font-size: 0.7rem;
    color: #64748b;
  }

  .mock-signatures {
    display: flex;
    justify-content: space-around;
    margin-top: 25px;
    text-align: center;
    font-size: 0.6875rem;
    color: #475569;
  }

  .mock-signature-line {
    border-top: 1px solid #94a3b8;
    padding-top: 4px;
    width: 140px;
  }
</style>
