-- ==============================================================================
-- RESTAURANTSTOCK — ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('admin', 'jefe_almacen', 'empleado')) NOT NULL DEFAULT 'empleado',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

-- 4. TABLA: PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA: INSUMOS (ALMACÉN)
CREATE TABLE IF NOT EXISTS insumos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id INT REFERENCES proveedores(id) ON DELETE SET NULL,
  unidad TEXT NOT NULL,                -- kg, litros, unidades, gramos, botellas
  stock_actual NUMERIC NOT NULL DEFAULT 0,
  stock_minimo NUMERIC NOT NULL DEFAULT 0,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: ORDENES DE COMPRA
CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  proveedor_id INT REFERENCES proveedores(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT CHECK (estado IN ('pendiente', 'recibido', 'cancelado')) NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA: DETALLE DE ORDEN
CREATE TABLE IF NOT EXISTS orden_detalle (
  id SERIAL PRIMARY KEY,
  orden_id INT REFERENCES ordenes(id) ON DELETE CASCADE,
  insumo_id INT REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC NOT NULL DEFAULT 0
);

-- 8. TABLA: RECEPCIÓN DE MERCADERÍAS
CREATE TABLE IF NOT EXISTS recepciones (
  id SERIAL PRIMARY KEY,
  orden_id INT REFERENCES ordenes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLA: DETALLE DE RECEPCIÓN
CREATE TABLE IF NOT EXISTS recepcion_detalle (
  id SERIAL PRIMARY KEY,
  recepcion_id INT REFERENCES recepciones(id) ON DELETE CASCADE,
  insumo_id INT REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad_recibida NUMERIC NOT NULL CHECK (cantidad_recibida > 0)
);

-- 10. TABLA: KARDEX (MOVIMIENTOS DE STOCK)
CREATE TABLE IF NOT EXISTS kardex (
  id SERIAL PRIMARY KEY,
  insumo_id INT REFERENCES insumos(id) ON DELETE RESTRICT,
  tipo TEXT CHECK (tipo IN ('entrada', 'salida')) NOT NULL,
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  saldo NUMERIC NOT NULL,
  referencia TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS RLS (Row Level Security) - HABILITADAS PERO PERMISIVAS PARA CLIENTES ANON
-- ==============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepcion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE kardex ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON proveedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON insumos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON ordenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON orden_detalle FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON recepciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON recepcion_detalle FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anon" ON kardex FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- DATOS SEMILLA (SEED DATA) DE PRUEBA
-- ==============================================================================

-- Contraseñas con SHA-256:
-- 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- 'jefe123'  -> e23a07ec822eb8cf2e1bc079e00ec78465499f5ea11a3648fef9d648057cd426
-- 'emp123'   -> c1e1e07bdfa6792344799042b0cff7319985a9df00085a67c6999b1e523f6631

INSERT INTO usuarios (id, nombre, email, password_hash, rol, activo) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Administrador Principal', 'admin@restaurant.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', true),
  ('a0000000-0000-0000-0000-000000000002', 'Lucía Torres', 'jefe@restaurant.com', 'e23a07ec822eb8cf2e1bc079e00ec78465499f5ea11a3648fef9d648057cd426', 'jefe_almacen', true),
  ('a0000000-0000-0000-0000-000000000003', 'Mateo Silva', 'empleado@restaurant.com', 'c1e1e07bdfa6792344799042b0cff7319985a9df00085a67c6999b1e523f6631', 'empleado', true)
ON CONFLICT (email) DO NOTHING;

-- Categorías iniciales
INSERT INTO categorias (id, nombre, descripcion) VALUES
  (1, 'Carnes y Aves', 'Cortes de res, pollo, cerdo y derivados cárnicos'),
  (2, 'Lácteos y Quesos', 'Leche, cremas, quesos frescos y madurados'),
  (3, 'Verduras y Frutas', 'Perecibles frescos de estación para cocina'),
  (4, 'Abarrotes y Granos', 'Arroz, harinas, pastas, aceites y especias'),
  (5, 'Bebidas y Licores', 'Vinos, cervezas, gaseosas y jarabes')
ON CONFLICT (id) DO NOTHING;

-- Proveedores iniciales
INSERT INTO proveedores (id, nombre, contacto, telefono, email, direccion) VALUES
  (1, 'Distribuidora Carnes del Sur', 'Carlos Mendoza', '+51 987 111 222', 'ventas@carnesdelsur.pe', 'Av. Argentina 1250, Lima'),
  (2, 'Lácteos San Fernando', 'Patricia Vega', '+51 987 333 444', 'pedidos@lacteossf.pe', 'Jr. Los Molles 410, Lima'),
  (3, 'Mercado Mayorista Agrícola', 'Jorge Rivas', '+51 987 555 666', 'jrivas@agricola.pe', 'Pabellón B Puesto 24, Lima'),
  (4, 'Abarrotes y Especias Continental', 'Elena Castro', '+51 987 777 888', 'contacto@continental.pe', 'Av. Colonial 820, Callao')
ON CONFLICT (id) DO NOTHING;

-- Insumos iniciales
INSERT INTO insumos (id, nombre, categoria_id, proveedor_id, unidad, stock_actual, stock_minimo, precio_unitario) VALUES
  (1, 'Lomo Fino de Res', 1, 1, 'kg', 24.5, 10.0, 48.00),
  (2, 'Pechuga de Pollo', 1, 1, 'kg', 18.0, 15.0, 16.50),
  (3, 'Queso Mozzarella', 2, 2, 'kg', 6.0, 8.0, 26.00),     -- ALERTA CRÍTICA
  (4, 'Leche Evaporada', 2, 2, 'unidades', 48.0, 24.0, 4.20),
  (5, 'Tomate Italiano', 3, 3, 'kg', 8.5, 12.0, 3.80),     -- ALERTA CRÍTICA
  (6, 'Cebolla Roja', 3, 3, 'kg', 15.0, 10.0, 2.90),
  (7, 'Papas Amarillas', 3, 3, 'kg', 45.0, 20.0, 3.20),
  (8, 'Aceite Vegetal 5L', 4, 4, 'unidades', 5.0, 4.0, 34.00),
  (9, 'Arroz Extra', 4, 4, 'kg', 50.0, 25.0, 4.10)
ON CONFLICT (id) DO NOTHING;

-- Movimientos iniciales de Kardex
INSERT INTO kardex (insumo_id, tipo, cantidad, saldo, referencia, usuario_id, fecha) VALUES
  (1, 'entrada', 30.0, 30.0, 'Inventario Inicial', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  (1, 'salida', 5.5, 24.5, 'Salida Cocina - Servicio Almuerzo', 'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'),
  (2, 'entrada', 25.0, 25.0, 'Inventario Inicial', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  (2, 'salida', 7.0, 18.0, 'Salida Cocina', 'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 days'),
  (3, 'entrada', 10.0, 10.0, 'Inventario Inicial', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  (3, 'salida', 4.0, 6.0, 'Pizzas y Pastas', 'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day');
