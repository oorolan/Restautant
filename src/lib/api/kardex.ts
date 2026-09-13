import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface KardexEntry {
  id: number;
  insumo_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  saldo: number;
  referencia: string;
  usuario_id: string;
  fecha: string;
  insumos?: { nombre: string; unidad: string };
  usuarios?: { nombre: string };
}

export async function getKardex(insumoId?: number, desde?: string, hasta?: string): Promise<KardexEntry[]> {
  try {
    let query = supabase
      .from('kardex')
      .select('*, insumos(nombre, unidad), usuarios(nombre)')
      .order('fecha', { ascending: false });

    if (insumoId) query = query.eq('insumo_id', insumoId);
    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59');

    const { data, error } = await query;
    if (!error && data) return data as KardexEntry[];
  } catch (err) {
    console.warn('Fallback a localStore para getKardex');
  }

  let list = localStore.getKardex() as KardexEntry[];
  if (insumoId) list = list.filter(k => k.insumo_id === insumoId);
  if (desde) list = list.filter(k => k.fecha >= desde);
  if (hasta) list = list.filter(k => k.fecha <= (hasta + 'T23:59:59'));
  return list;
}
