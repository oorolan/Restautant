import { supabase } from '../supabase';
import { localStore } from './mockData';

export interface RecepcionDetalle {
  insumo_id: number;
  cantidad_recibida: number;
  insumos?: { nombre: string; unidad: string };
}

export interface Recepcion {
  id: number;
  orden_id: number | null;
  usuario_id: string;
  fecha: string;
  notas: string;
  created_at: string;
  ordenes?: { id: number };
  usuarios?: { nombre: string };
  recepcion_detalle?: RecepcionDetalle[];
}

export async function getRecepciones(): Promise<Recepcion[]> {
  try {
    const { data, error } = await supabase
      .from('recepciones')
      .select('*, usuarios(nombre), recepcion_detalle(*, insumos(nombre, unidad))')
      .order('created_at', { ascending: false });
    if (!error && data) return data as Recepcion[];
  } catch (err) {
    console.warn('Fallback a localStore para getRecepciones');
  }
  return localStore.getRecepciones() as Recepcion[];
}

export async function registrarRecepcion(payload: {
  orden_id: number | null;
  usuario_id: string;
  fecha: string;
  notas: string;
  items: { insumo_id: number; cantidad_recibida: number }[];
}): Promise<Recepcion> {
  // Try Supabase first
  try {
    const { data: rec, error: recErr } = await supabase
      .from('recepciones')
      .insert({
        orden_id: payload.orden_id,
        usuario_id: payload.usuario_id,
        fecha: payload.fecha,
        notas: payload.notas,
      })
      .select()
      .single();

    if (!recErr && rec) {
      const detalles = payload.items.map(i => ({
        recepcion_id: rec.id,
        insumo_id: i.insumo_id,
        cantidad_recibida: i.cantidad_recibida,
      }));
      await supabase.from('recepcion_detalle').insert(detalles);

      for (const item of payload.items) {
        const { data: insumo } = await supabase
          .from('insumos')
          .select('stock_actual')
          .eq('id', item.insumo_id)
          .single();

        if (insumo) {
          const nuevoSaldo = insumo.stock_actual + item.cantidad_recibida;
          await supabase
            .from('insumos')
            .update({ stock_actual: nuevoSaldo })
            .eq('id', item.insumo_id);

          await supabase.from('kardex').insert({
            insumo_id: item.insumo_id,
            tipo: 'entrada',
            cantidad: item.cantidad_recibida,
            saldo: nuevoSaldo,
            referencia: `Recepción #${rec.id}`,
            usuario_id: payload.usuario_id,
          });
        }
      }

      if (payload.orden_id) {
        await supabase
          .from('ordenes')
          .update({ estado: 'recibido' })
          .eq('id', payload.orden_id);
      }

      return rec as Recepcion;
    }
  } catch (err) {
    console.warn('Fallback a localStore para registrarRecepcion');
  }

  // Local fallback
  const recList = localStore.getRecepciones();
  const insumos = localStore.getInsumos();
  const kardexList = localStore.getKardex();
  const users = localStore.getUsuarios();
  const nextId = recList.length > 0 ? Math.max(...recList.map((r: any) => r.id)) + 1 : 201;

  const user = users.find((u: any) => u.id === payload.usuario_id);

  const newRec: Recepcion = {
    id: nextId,
    orden_id: payload.orden_id,
    usuario_id: payload.usuario_id,
    fecha: payload.fecha,
    notas: payload.notas,
    created_at: new Date().toISOString(),
    usuarios: user ? { nombre: user.nombre } : undefined,
    recepcion_detalle: payload.items.map(i => {
      const ins = insumos.find((item: any) => item.id === i.insumo_id);
      return {
        insumo_id: i.insumo_id,
        cantidad_recibida: i.cantidad_recibida,
        insumos: ins ? { nombre: ins.nombre, unidad: ins.unidad } : undefined
      };
    })
  };

  // Update stock & add kardex for each item
  const updatedInsumos = [...insumos];
  const newKardexEntries: any[] = [];

  for (const item of payload.items) {
    const ins = updatedInsumos.find(i => i.id === item.insumo_id);
    if (ins) {
      const nuevoSaldo = Number(ins.stock_actual) + Number(item.cantidad_recibida);
      ins.stock_actual = nuevoSaldo;

      newKardexEntries.push({
        id: Date.now() + Math.random(),
        insumo_id: item.insumo_id,
        tipo: 'entrada' as const,
        cantidad: Number(item.cantidad_recibida),
        saldo: nuevoSaldo,
        referencia: `Recepción #${newRec.id}${payload.orden_id ? ` (Orden #${payload.orden_id})` : ''}`,
        usuario_id: payload.usuario_id,
        fecha: new Date().toISOString(),
        insumos: { nombre: ins.nombre, unidad: ins.unidad },
        usuarios: { nombre: user?.nombre ?? 'Jefe de Almacén' }
      });
    }
  }

  localStore.setInsumos(updatedInsumos);
  localStore.setKardex([...newKardexEntries, ...kardexList]);

  // Mark linked order as recibido
  if (payload.orden_id) {
    const ordenes = localStore.getOrdenes();
    const updatedOrdenes = ordenes.map((o: any) =>
      o.id === payload.orden_id ? { ...o, estado: 'recibido' } : o
    );
    localStore.setOrdenes(updatedOrdenes);
  }

  localStore.setRecepciones([newRec, ...recList]);
  return newRec;
}
