import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface Insumo {
  id: number;
  nombre: string;
  categoria_id: number | null;
  proveedor_id: number | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  created_at: string;
  categorias?: { nombre: string };
  proveedores?: { nombre: string; telefono?: string };
}

export async function getInsumos(): Promise<Insumo[]> {
  try {
    const { data, error } = await supabase
      .from('insumos')
      .select('*, categorias(nombre), proveedores(nombre, telefono)')
      .order('nombre');
    if (!error && data) return data as Insumo[];
  } catch (err) {
    console.warn('Fallback a localStore para getInsumos');
  }
  return localStore.getInsumos() as Insumo[];
}

export async function createInsumo(payload: Omit<Insumo, 'id' | 'created_at' | 'categorias' | 'proveedores'>): Promise<Insumo> {
  try {
    const { data, error } = await supabase
      .from('insumos')
      .insert(payload)
      .select('*, categorias(nombre), proveedores(nombre)')
      .single();
    if (!error && data) return data as Insumo;
  } catch (err) {
    console.warn('Fallback a localStore para createInsumo');
  }

  const list = localStore.getInsumos();
  const cats = localStore.getCategorias();
  const provs = localStore.getProveedores();
  const nextId = list.length > 0 ? Math.max(...list.map((i: any) => i.id)) + 1 : 1;

  const catMatch = cats.find((c: any) => c.id === payload.categoria_id);
  const provMatch = provs.find((p: any) => p.id === payload.proveedor_id);

  const newInsumo: Insumo = {
    ...payload,
    id: nextId,
    created_at: new Date().toISOString(),
    categorias: catMatch ? { nombre: catMatch.nombre } : undefined,
    proveedores: provMatch ? { nombre: provMatch.nombre } : undefined
  };

  localStore.setInsumos([...list, newInsumo]);

  // Initial kardex entry if stock > 0
  if (newInsumo.stock_actual > 0) {
    const kardexList = localStore.getKardex();
    localStore.setKardex([
      {
        id: Date.now(),
        insumo_id: newInsumo.id,
        tipo: 'entrada',
        cantidad: newInsumo.stock_actual,
        saldo: newInsumo.stock_actual,
        referencia: 'Stock Inicial',
        usuario_id: 'sistema',
        fecha: new Date().toISOString(),
        insumos: { nombre: newInsumo.nombre, unidad: newInsumo.unidad },
        usuarios: { nombre: 'Sistema' }
      },
      ...kardexList
    ]);
  }

  return newInsumo;
}

export async function updateInsumo(id: number, payload: Partial<Insumo>): Promise<Insumo> {
  const { categorias, proveedores, created_at, ...rest } = payload;
  try {
    const { data, error } = await supabase
      .from('insumos')
      .update(rest)
      .eq('id', id)
      .select('*, categorias(nombre), proveedores(nombre)')
      .single();
    if (!error && data) return data as Insumo;
  } catch (err) {
    console.warn('Fallback a localStore para updateInsumo');
  }

  const list = localStore.getInsumos();
  const cats = localStore.getCategorias();
  const provs = localStore.getProveedores();

  let updatedItem: Insumo | null = null;
  const newList = list.map((i: any) => {
    if (i.id === id) {
      const merged = { ...i, ...rest };
      if (merged.categoria_id) {
        const cat = cats.find((c: any) => c.id === merged.categoria_id);
        merged.categorias = cat ? { nombre: cat.nombre } : undefined;
      }
      if (merged.proveedor_id) {
        const prov = provs.find((p: any) => p.id === merged.proveedor_id);
        merged.proveedores = prov ? { nombre: prov.nombre } : undefined;
      }
      updatedItem = merged;
      return merged;
    }
    return i;
  });

  localStore.setInsumos(newList);
  return updatedItem!;
}

export async function deleteInsumo(id: number) {
  try {
    const { error } = await supabase
      .from('insumos')
      .delete()
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para deleteInsumo');
  }

  const list = localStore.getInsumos().filter((i: any) => i.id !== id);
  localStore.setInsumos(list);
}

export async function registrarSalida(insumoId: number, cantidad: number, usuarioId: string, referencia: string) {
  // Try Supabase first
  try {
    const { data: insumo, error: fetchErr } = await supabase
      .from('insumos')
      .select('stock_actual')
      .eq('id', insumoId)
      .single();

    if (!fetchErr && insumo) {
      const nuevoSaldo = insumo.stock_actual - cantidad;
      if (nuevoSaldo < 0) throw new Error('Stock insuficiente en inventario');

      const { error: updateErr } = await supabase
        .from('insumos')
        .update({ stock_actual: nuevoSaldo })
        .eq('id', insumoId);
      if (updateErr) throw updateErr;

      await supabase.from('kardex').insert({
        insumo_id: insumoId,
        tipo: 'salida',
        cantidad,
        saldo: nuevoSaldo,
        referencia,
        usuario_id: usuarioId,
      });
      return;
    }
  } catch (err: any) {
    if (err.message === 'Stock insuficiente en inventario') throw err;
    console.warn('Fallback a localStore para registrarSalida');
  }

  // Fallback to local storage
  const list = localStore.getInsumos();
  const insumo = list.find((i: any) => i.id === insumoId);
  if (!insumo) throw new Error('Insumo no encontrado');

  const nuevoSaldo = Number(insumo.stock_actual) - Number(cantidad);
  if (nuevoSaldo < 0) throw new Error('Stock insuficiente en inventario');

  insumo.stock_actual = nuevoSaldo;
  localStore.setInsumos([...list]);

  const user = localStore.getUsuarios().find((u: any) => u.id === usuarioId);
  const kardexList = localStore.getKardex();
  const newKardexEntry = {
    id: Date.now(),
    insumo_id: insumoId,
    tipo: 'salida' as const,
    cantidad: Number(cantidad),
    saldo: nuevoSaldo,
    referencia,
    usuario_id: usuarioId,
    fecha: new Date().toISOString(),
    insumos: { nombre: insumo.nombre, unidad: insumo.unidad },
    usuarios: { nombre: user?.nombre ?? 'Empleado' }
  };
  localStore.setKardex([newKardexEntry, ...kardexList]);
}
