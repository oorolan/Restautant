// Fallback local data when Supabase credentials are not configured or app is offline

export const INITIAL_CATEGORIAS = [
  { id: 1, nombre: 'Carnes y Aves', descripcion: 'Cortes de res, pollo, cerdo y embutidos' },
  { id: 2, nombre: 'Lácteos y Quesos', descripcion: 'Leche, cremas, quesos frescos y madurados' },
  { id: 3, nombre: 'Verduras y Frutas', descripcion: 'Perecibles frescos de cocina' },
  { id: 4, nombre: 'Abarrotes y Granos', descripcion: 'Arroz, aceites, especias y harinas' },
  { id: 5, nombre: 'Bebidas y Licores', descripcion: 'Vinos, cervezas, gaseosas e insumos de bar' }
];

export const INITIAL_PROVEEDORES = [
  { id: 1, nombre: 'Distribuidora Carnes del Sur', contacto: 'Carlos Mendoza', telefono: '+51 987 111 222', email: 'ventas@carnesdelsur.pe', direccion: 'Av. Argentina 1250, Lima', created_at: new Date().toISOString() },
  { id: 2, nombre: 'Lácteos San Fernando', contacto: 'Patricia Vega', telefono: '+51 987 333 444', email: 'pedidos@lacteossf.pe', direccion: 'Jr. Los Molles 410, Lima', created_at: new Date().toISOString() },
  { id: 3, nombre: 'Mercado Mayorista Agrícola', contacto: 'Jorge Rivas', telefono: '+51 987 555 666', email: 'jrivas@agricola.pe', direccion: 'Pabellón B Puesto 24, Lima', created_at: new Date().toISOString() },
  { id: 4, nombre: 'Abarrotes Continental S.A.', contacto: 'Elena Castro', telefono: '+51 987 777 888', email: 'contacto@continental.pe', direccion: 'Av. Colonial 820, Callao', created_at: new Date().toISOString() }
];

export const INITIAL_INSUMOS = [
  { id: 1, nombre: 'Lomo Fino de Res', categoria_id: 1, proveedor_id: 1, unidad: 'kg', stock_actual: 24.5, stock_minimo: 10.0, precio_unitario: 48.00, created_at: new Date().toISOString(), categorias: { nombre: 'Carnes y Aves' }, proveedores: { nombre: 'Distribuidora Carnes del Sur' } },
  { id: 2, nombre: 'Pechuga de Pollo', categoria_id: 1, proveedor_id: 1, unidad: 'kg', stock_actual: 18.0, stock_minimo: 15.0, precio_unitario: 16.50, created_at: new Date().toISOString(), categorias: { nombre: 'Carnes y Aves' }, proveedores: { nombre: 'Distribuidora Carnes del Sur' } },
  { id: 3, nombre: 'Queso Mozzarella', categoria_id: 2, proveedor_id: 2, unidad: 'kg', stock_actual: 6.0, stock_minimo: 8.0, precio_unitario: 26.00, created_at: new Date().toISOString(), categorias: { nombre: 'Lácteos y Quesos' }, proveedores: { nombre: 'Lácteos San Fernando' } }, // CRÍTICO
  { id: 4, nombre: 'Leche Evaporada', categoria_id: 2, proveedor_id: 2, unidad: 'unidades', stock_actual: 48.0, stock_minimo: 24.0, precio_unitario: 4.20, created_at: new Date().toISOString(), categorias: { nombre: 'Lácteos y Quesos' }, proveedores: { nombre: 'Lácteos San Fernando' } },
  { id: 5, nombre: 'Tomate Italiano', categoria_id: 3, proveedor_id: 3, unidad: 'kg', stock_actual: 8.5, stock_minimo: 12.0, precio_unitario: 3.80, created_at: new Date().toISOString(), categorias: { nombre: 'Verduras y Frutas' }, proveedores: { nombre: 'Mercado Mayorista Agrícola' } }, // CRÍTICO
  { id: 6, nombre: 'Cebolla Roja', categoria_id: 3, proveedor_id: 3, unidad: 'kg', stock_actual: 15.0, stock_minimo: 10.0, precio_unitario: 2.90, created_at: new Date().toISOString(), categorias: { nombre: 'Verduras y Frutas' }, proveedores: { nombre: 'Mercado Mayorista Agrícola' } },
  { id: 7, nombre: 'Papas Amarillas', categoria_id: 3, proveedor_id: 3, unidad: 'kg', stock_actual: 45.0, stock_minimo: 20.0, precio_unitario: 3.20, created_at: new Date().toISOString(), categorias: { nombre: 'Verduras y Frutas' }, proveedores: { nombre: 'Mercado Mayorista Agrícola' } },
  { id: 8, nombre: 'Aceite Vegetal 5L', categoria_id: 4, proveedor_id: 4, unidad: 'unidades', stock_actual: 5.0, stock_minimo: 4.0, precio_unitario: 34.00, created_at: new Date().toISOString(), categorias: { nombre: 'Abarrotes y Granos' }, proveedores: { nombre: 'Abarrotes Continental S.A.' } },
  { id: 9, nombre: 'Arroz Extra', categoria_id: 4, proveedor_id: 4, unidad: 'kg', stock_actual: 50.0, stock_minimo: 25.0, precio_unitario: 4.10, created_at: new Date().toISOString(), categorias: { nombre: 'Abarrotes y Granos' }, proveedores: { nombre: 'Abarrotes Continental S.A.' } }
];

export const INITIAL_USUARIOS = [
  { id: 'usr-admin-1', nombre: 'Carlos Ruiz (Admin)', email: 'admin@restaurant.com', rol: 'admin' as const, activo: true, password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' },
  { id: 'usr-jefe-2', nombre: 'Lucía Torres', email: 'jefe@restaurant.com', rol: 'jefe_almacen' as const, activo: true, password_hash: 'e23a07ec822eb8cf2e1bc079e00ec78465499f5ea11a3648fef9d648057cd426' },
  { id: 'usr-emp-3', nombre: 'Mateo Silva', email: 'empleado@restaurant.com', rol: 'empleado' as const, activo: true, password_hash: 'c1e1e07bdfa6792344799042b0cff7319985a9df00085a67c6999b1e523f6631' }
];

export const INITIAL_ORDENES = [
  {
    id: 101,
    proveedor_id: 1,
    usuario_id: 'usr-jefe-2',
    fecha: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    estado: 'pendiente' as const,
    notas: 'Pedido semanal para cortes de fin de semana',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    proveedores: { nombre: 'Distribuidora Carnes del Sur' },
    usuarios: { nombre: 'Lucía Torres' },
    orden_detalle: [
      { id: 1, insumo_id: 1, cantidad: 20, precio_unitario: 48.0, insumos: { nombre: 'Lomo Fino de Res', unidad: 'kg' } },
      { id: 2, insumo_id: 2, cantidad: 30, precio_unitario: 16.5, insumos: { nombre: 'Pechuga de Pollo', unidad: 'kg' } }
    ]
  },
  {
    id: 100,
    proveedor_id: 2,
    usuario_id: 'usr-admin-1',
    fecha: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    estado: 'recibido' as const,
    notas: 'Lácteos para pastelería y salsas',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    proveedores: { nombre: 'Lácteos San Fernando' },
    usuarios: { nombre: 'Carlos Ruiz (Admin)' },
    orden_detalle: [
      { id: 3, insumo_id: 3, cantidad: 10, precio_unitario: 26.0, insumos: { nombre: 'Queso Mozzarella', unidad: 'kg' } }
    ]
  }
];

export const INITIAL_RECEPCIONES = [
  {
    id: 201,
    orden_id: 100,
    usuario_id: 'usr-jefe-2',
    fecha: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    notas: 'Recibido conforme factura #F001-492',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    usuarios: { nombre: 'Lucía Torres' },
    recepcion_detalle: [
      { insumo_id: 3, cantidad_recibida: 10, insumos: { nombre: 'Queso Mozzarella', unidad: 'kg' } }
    ]
  }
];

export const INITIAL_KARDEX = [
  {
    id: 1,
    insumo_id: 1,
    tipo: 'entrada' as const,
    cantidad: 30.0,
    saldo: 30.0,
    referencia: 'Inventario Inicial',
    usuario_id: 'usr-admin-1',
    fecha: new Date(Date.now() - 86400000 * 6).toISOString(),
    insumos: { nombre: 'Lomo Fino de Res', unidad: 'kg' },
    usuarios: { nombre: 'Carlos Ruiz (Admin)' }
  },
  {
    id: 2,
    insumo_id: 1,
    tipo: 'salida' as const,
    cantidad: 5.5,
    saldo: 24.5,
    referencia: 'Salida Cocina - Servicio Almuerzo',
    usuario_id: 'usr-emp-3',
    fecha: new Date(Date.now() - 86400000 * 1).toISOString(),
    insumos: { nombre: 'Lomo Fino de Res', unidad: 'kg' },
    usuarios: { nombre: 'Mateo Silva' }
  },
  {
    id: 3,
    insumo_id: 2,
    tipo: 'entrada' as const,
    cantidad: 25.0,
    saldo: 25.0,
    referencia: 'Inventario Inicial',
    usuario_id: 'usr-admin-1',
    fecha: new Date(Date.now() - 86400000 * 6).toISOString(),
    insumos: { nombre: 'Pechuga de Pollo', unidad: 'kg' },
    usuarios: { nombre: 'Carlos Ruiz (Admin)' }
  },
  {
    id: 4,
    insumo_id: 2,
    tipo: 'salida' as const,
    cantidad: 7.0,
    saldo: 18.0,
    referencia: 'Salida Cocina',
    usuario_id: 'usr-emp-3',
    fecha: new Date(Date.now() - 86400000 * 2).toISOString(),
    insumos: { nombre: 'Pechuga de Pollo', unidad: 'kg' },
    usuarios: { nombre: 'Mateo Silva' }
  },
  {
    id: 5,
    insumo_id: 3,
    tipo: 'entrada' as const,
    cantidad: 10.0,
    saldo: 10.0,
    referencia: 'Recepción #201 (Orden #100)',
    usuario_id: 'usr-jefe-2',
    fecha: new Date(Date.now() - 86400000 * 4).toISOString(),
    insumos: { nombre: 'Queso Mozzarella', unidad: 'kg' },
    usuarios: { nombre: 'Lucía Torres' }
  },
  {
    id: 6,
    insumo_id: 3,
    tipo: 'salida' as const,
    cantidad: 4.0,
    saldo: 6.0,
    referencia: 'Elaboración Pizzas y Lasañas',
    usuario_id: 'usr-emp-3',
    fecha: new Date(Date.now() - 86400000 * 1).toISOString(),
    insumos: { nombre: 'Queso Mozzarella', unidad: 'kg' },
    usuarios: { nombre: 'Mateo Silva' }
  }
];

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem('rs_' + key);
    if (!raw) {
      localStorage.setItem('rs_' + key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T) {
  try {
    localStorage.setItem('rs_' + key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export const localStore = {
  getInsumos: () => getStorage('insumos', INITIAL_INSUMOS),
  setInsumos: (val: any) => setStorage('insumos', val),

  getCategorias: () => getStorage('categorias', INITIAL_CATEGORIAS),
  setCategorias: (val: any) => setStorage('categorias', val),

  getProveedores: () => getStorage('proveedores', INITIAL_PROVEEDORES),
  setProveedores: (val: any) => setStorage('proveedores', val),

  getUsuarios: () => getStorage('usuarios', INITIAL_USUARIOS),
  setUsuarios: (val: any) => setStorage('usuarios', val),

  getOrdenes: () => getStorage('ordenes', INITIAL_ORDENES),
  setOrdenes: (val: any) => setStorage('ordenes', val),

  getRecepciones: () => getStorage('recepciones', INITIAL_RECEPCIONES),
  setRecepciones: (val: any) => setStorage('recepciones', val),

  getKardex: () => getStorage('kardex', INITIAL_KARDEX),
  setKardex: (val: any) => setStorage('kardex', val),
};
