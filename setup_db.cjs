const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Restaurant_db%2F2026@db.sgzzllthfqmaxcejecws.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ ¡Conexión exitosa!');

    // Read schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📦 Ejecutando schema.sql...');

    // Split by semicolons but skip empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let ok = 0;
    let skipped = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
        // Show which table/object was created
        if (stmt.toLowerCase().includes('create table')) {
          const match = stmt.match(/create table if not exists\s+(\w+)/i);
          if (match) console.log(`  ✅ Tabla '${match[1]}' creada / verificada`);
        } else if (stmt.toLowerCase().includes('insert into')) {
          const match = stmt.match(/insert into\s+(\w+)/i);
          if (match) console.log(`  📝 Datos insertados en '${match[1]}'`);
        } else if (stmt.toLowerCase().includes('create policy')) {
          console.log(`  🔒 Política RLS aplicada`);
        } else if (stmt.toLowerCase().includes('enable row level security')) {
          const match = stmt.match(/on\s+(\w+)/i);
          if (match) console.log(`  🛡️  RLS habilitado en '${match[1]}'`);
        }
      } catch (e) {
        // Ignore "already exists" errors
        if (e.code === '42710' || e.code === '42P07' || e.message.includes('already exists')) {
          skipped++;
        } else if (e.code === '23505') {
          // Duplicate key on INSERT — seed data already exists
          skipped++;
        } else {
          console.warn(`  ⚠️  Error en sentencia: ${e.message.split('\n')[0]}`);
        }
      }
    }

    console.log(`\n✅ Schema completado: ${ok} sentencias ejecutadas, ${skipped} ya existían.`);

    // Verify connection by reading users
    console.log('\n🔍 Verificando usuarios creados:');
    const result = await client.query('SELECT nombre, email, rol, activo FROM usuarios ORDER BY nombre;');
    if (result.rows.length === 0) {
      console.log('  ⚠️  No se encontraron usuarios. Los datos de prueba pueden no haberse insertado.');
    } else {
      result.rows.forEach(u => {
        const icon = u.rol === 'admin' ? '🛡️' : u.rol === 'jefe_almacen' ? '📦' : '👨‍🍳';
        console.log(`  ${icon} ${u.nombre} | ${u.email} | ${u.rol} | activo: ${u.activo}`);
      });
    }

    // Verify insumos
    console.log('\n📦 Insumos en Almacén:');
    const ins = await client.query('SELECT nombre, stock_actual, stock_minimo, unidad FROM insumos ORDER BY nombre;');
    ins.rows.forEach(i => {
      const alert = i.stock_actual <= i.stock_minimo ? '🔴' : '✅';
      console.log(`  ${alert} ${i.nombre}: ${i.stock_actual} ${i.unidad} (mín: ${i.stock_minimo})`);
    });

  } catch (err) {
    console.error('\n❌ Error de conexión:', err.message);
    console.error('Código:', err.code);
  } finally {
    await client.end();
    console.log('\n🔒 Conexión cerrada.');
  }
}

run();
