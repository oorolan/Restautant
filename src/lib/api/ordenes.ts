import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface OrdenDetalle {
  id?: number;
  insumo_id: number;
  cantidad: number;
  precio_unitario: number;
  insumos?: { nombre: string; unidad: string };
}

export interface Orden {
  id: number;
  proveedor_id: number;
  usuario_id: string;
  fecha: string;
  estado: 'pendiente' | 'recibido' | 'cancelado';
  notas: string;
  created_at: string;
  proveedores?: { nombre: string };
  usuarios?: { nombre: string };
  orden_detalle?: OrdenDetalle[];
}

export async function getOrdenes(): Promise<Orden[]> {
  try {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*, proveedores(nombre), usuarios(nombre), orden_detalle(*, insumos(nombre, unidad))')
      .order('created_at', { ascending: false });
    if (!error && data) return data as Orden[];
  } catch (err) {
    console.warn('Fallback a localStore para getOrdenes');
  }
  return localStore.getOrdenes() as Orden[];
}

export async function createOrden(payload: {
  proveedor_id: number;
  usuario_id: string;
  fecha: string;
  notas: string;
  items: { insumo_id: number; cantidad: number; precio_unitario: number }[];
}): Promise<Orden> {
  try {
    const { data: orden, error: ordenErr } = await supabase
      .from('ordenes')
      .insert({
        proveedor_id: payload.proveedor_id,
        usuario_id: payload.usuario_id,
        fecha: payload.fecha,
        notas: payload.notas,
      })
      .select()
      .single();

    if (!ordenErr && orden) {
      if (payload.items.length > 0) {
        const detalles = payload.items.map(i => ({
          orden_id: orden.id,
          insumo_id: i.insumo_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        }));
        await supabase.from('orden_detalle').insert(detalles);
      }
      return orden as Orden;
    }
  } catch (err) {
    console.warn('Fallback a localStore para createOrden');
  }

  const list = localStore.getOrdenes();
  const provs = localStore.getProveedores();
  const users = localStore.getUsuarios();
  const insumos = localStore.getInsumos();

  const nextId = list.length > 0 ? Math.max(...list.map((o: any) => o.id)) + 1 : 101;
  const prov = provs.find((p: any) => p.id === payload.proveedor_id);
  const user = users.find((u: any) => u.id === payload.usuario_id);

  const newOrden: Orden = {
    id: nextId,
    proveedor_id: payload.proveedor_id,
    usuario_id: payload.usuario_id,
    fecha: payload.fecha,
    estado: 'pendiente',
    notas: payload.notas,
    created_at: new Date().toISOString(),
    proveedores: prov ? { nombre: prov.nombre } : undefined,
    usuarios: user ? { nombre: user.nombre } : undefined,
    orden_detalle: payload.items.map((i, idx) => {
      const ins = insumos.find((item: any) => item.id === i.insumo_id);
      return {
        id: idx + 1,
        insumo_id: i.insumo_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        insumos: ins ? { nombre: ins.nombre, unidad: ins.unidad } : undefined
      };
    })
  };

  localStore.setOrdenes([newOrden, ...list]);
  return newOrden;
}

export async function cancelarOrden(id: number) {
  try {
    const { error } = await supabase
      .from('ordenes')
      .update({ estado: 'cancelado' })
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para cancelarOrden');
  }

  const list = localStore.getOrdenes().map((o: any) =>
    o.id === id ? { ...o, estado: 'cancelado' } : o
  );
  localStore.setOrdenes(list);
}
