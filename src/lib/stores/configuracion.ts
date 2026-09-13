import { writable } from 'svelte/store';
import {
  getConfiguracion,
  saveConfiguracion,
  CONFIG_DEFAULT,
  type ConfiguracionRestaurante
} from '../api/configuracion';

export const configuracion = writable<ConfiguracionRestaurante>(CONFIG_DEFAULT);
export const configLoading = writable<boolean>(false);

export async function initConfiguracion() {
  configLoading.set(true);
  try {
    const data = await getConfiguracion();
    configuracion.set(data);
  } catch (e) {
    console.error('Error cargando configuración:', e);
  } finally {
    configLoading.set(false);
  }
}

export async function updateConfiguracion(data: ConfiguracionRestaurante): Promise<ConfiguracionRestaurante> {
  configLoading.set(true);
  try {
    const saved = await saveConfiguracion(data);
    configuracion.set(saved);
    return saved;
  } finally {
    configLoading.set(false);
  }
}
