import { supabase } from '../supabase';

export interface ConfiguracionRestaurante {
  id?: string;
  nombre_comercial: string;
  razon_social: string;
  identificacion_fiscal: string; // RUC / NIT / CIF
  direccion: string;
  telefono: string;
  email: string;
  sitio_web: string;
  moneda_simbolo: string; // ej. '$', 'S/.', '€'
  moneda_codigo: string;  // ej. 'USD', 'PEN', 'EUR'
  impuesto_porcentaje: number; // ej. 18 o 16
  lema: string;
  pie_reportes: string;
  updated_at?: string;
}

export const CONFIG_DEFAULT: ConfiguracionRestaurante = {
  nombre_comercial: 'La Trattoria Gourmet',
  razon_social: 'Gastronomía & Servicios S.A.C.',
  identificacion_fiscal: '20608945123',
  direccion: 'Av. Mariscal La Mar 1120, Miraflores, Lima',
  telefono: '+51 987 654 321',
  email: 'administracion@latrattoriagourmet.com',
  sitio_web: 'www.latrattoriagourmet.com',
  moneda_simbolo: '$',
  moneda_codigo: 'USD',
  impuesto_porcentaje: 18,
  lema: 'Excelencia culinaria y gestión de calidad',
  pie_reportes: 'Documento interno confidencial para control y auditoría de inventario.'
};

const STORAGE_KEY = 'rs_configuracion';

export async function getConfiguracion(): Promise<ConfiguracionRestaurante> {
  // 1. Intentar cargar desde Supabase si existe la tabla
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      // Guardar también en cache local
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data as ConfiguracionRestaurante;
    }
  } catch {
    // Si falla la tabla o no hay red, continuamos a local
  }

  // 2. Fallback a localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...CONFIG_DEFAULT, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }

  // 3. Si no hay nada, guardar default
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(CONFIG_DEFAULT));
  } catch {
    // ignore
  }
  return { ...CONFIG_DEFAULT };
}

export async function saveConfiguracion(config: ConfiguracionRestaurante): Promise<ConfiguracionRestaurante> {
  const updated: ConfiguracionRestaurante = {
    ...config,
    updated_at: new Date().toISOString()
  };

  // 1. Guardar en localStorage inmediatamente
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error guardando configuración localmente:', err);
  }

  // 2. Intentar persistir en Supabase si la tabla existe
  try {
    const { data: existing } = await supabase
      .from('configuracion')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('configuracion')
        .update(updated)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('configuracion')
        .insert([updated]);
    }
  } catch {
    // Si la tabla no está creada en Supabase, no arrojamos error porque ya está guardado en localStorage
  }

  return updated;
}
