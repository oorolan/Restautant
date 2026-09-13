import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  created_at: string;
}

export async function getProveedores(): Promise<Proveedor[]> {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre');
    if (!error && data) return data as Proveedor[];
  } catch (err) {
    console.warn('Fallback a localStore para getProveedores');
  }
  return localStore.getProveedores() as Proveedor[];
}

export async function createProveedor(payload: Omit<Proveedor, 'id' | 'created_at'>): Promise<Proveedor> {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .insert(payload)
      .select()
      .single();
    if (!error && data) return data as Proveedor;
  } catch (err) {
    console.warn('Fallback a localStore para createProveedor');
  }

  const list = localStore.getProveedores();
  const nextId = list.length > 0 ? Math.max(...list.map((p: any) => p.id)) + 1 : 1;
  const newProv = {
    ...payload,
    id: nextId,
    created_at: new Date().toISOString()
  };
  localStore.setProveedores([...list, newProv]);
  return newProv as Proveedor;
}

export async function updateProveedor(id: number, payload: Partial<Proveedor>) {
  try {
    const { error } = await supabase
      .from('proveedores')
      .update(payload)
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para updateProveedor');
  }

  const list = localStore.getProveedores().map((p: any) =>
    p.id === id ? { ...p, ...payload } : p
  );
  localStore.setProveedores(list);
}

export async function deleteProveedor(id: number) {
  try {
    const { error } = await supabase
      .from('proveedores')
      .delete()
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para deleteProveedor');
  }

  const list = localStore.getProveedores().filter((p: any) => p.id !== id);
  localStore.setProveedores(list);
}
