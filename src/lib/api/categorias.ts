import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export async function getCategorias(): Promise<Categoria[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');
    if (!error && data) return data as Categoria[];
  } catch (err) {
    console.warn('Fallback a localStore para getCategorias');
  }
  return localStore.getCategorias() as Categoria[];
}

export async function createCategoria(nombre: string, descripcion: string): Promise<Categoria> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre, descripcion })
      .select()
      .single();
    if (!error && data) return data as Categoria;
  } catch (err) {
    console.warn('Fallback a localStore para createCategoria');
  }

  const list = localStore.getCategorias();
  const nextId = list.length > 0 ? Math.max(...list.map((c: any) => c.id)) + 1 : 1;
  const newCat = { id: nextId, nombre, descripcion };
  localStore.setCategorias([...list, newCat]);
  return newCat;
}

export async function updateCategoria(id: number, nombre: string, descripcion: string) {
  try {
    const { error } = await supabase
      .from('categorias')
      .update({ nombre, descripcion })
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para updateCategoria');
  }

  const list = localStore.getCategorias().map((c: any) =>
    c.id === id ? { ...c, nombre, descripcion } : c
  );
  localStore.setCategorias(list);
}

export async function deleteCategoria(id: number) {
  try {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para deleteCategoria');
  }

  const list = localStore.getCategorias().filter((c: any) => c.id !== id);
  localStore.setCategorias(list);
}
