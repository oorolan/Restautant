const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://sgzzllthfqmaxcejecws.supabase.co';
const SERVICE_KEY = 'sb_secret_KHti943Dh23_ePsGunLKgw_isgvoZhj';
const ANON_KEY = 'sb_publishable_j8mMyDU38rbE7F34vsUdTg_w54sOP-Z';

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Execute SQL via Supabase Management API (requires postgres password)
async function execSQLviaRPC(sql, key) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
  return httpsRequest(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }
  }, JSON.stringify({ sql }));
}

async function main() {
  console.log('🔬 Diagnóstico de la base de datos Supabase\n');

  // Check if tabla usuarios exists via information_schema via RPC
  // The error is "permission denied for table usuarios" which means the TABLE EXISTS
  // but the anon role doesn't have SELECT permission — that's an RLS policy issue
  
  console.log('📌 DIAGNÓSTICO:');
  console.log('   El error "permission denied for table usuarios" (código 42501) indica que:');
  console.log('   ✅ La tabla "usuarios" SÍ EXISTE en tu base de datos.');
  console.log('   ❌ Pero las políticas RLS no permiten acceso al rol "anon".\n');

  // Try to check if RLS is properly set up using the Supabase Management API
  // The correct endpoint to run SQL in Supabase Management API is:
  // POST https://api.supabase.com/v1/projects/{ref}/database/query
  // But this requires a personal access token (PAT), not the project keys.

  // Alternative: check via direct pg connection (port 5432 was not accessible)
  // but we can try port 6543 (pooler) or 5432 with different host

  // Let's try the Supabase pooler connection
  console.log('🔌 Intentando conectar vía pg (puerto directo)...');
  
  // Since DNS for db.* doesn't resolve, let's try the project pooler
  const { Client } = require('pg');
  
  const hosts = [
    `postgresql://postgres:Restaurant_db%2F2026@db.sgzzllthfqmaxcejecws.supabase.co:5432/postgres`,
    `postgresql://postgres.sgzzllthfqmaxcejecws:Restaurant_db%2F2026@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.sgzzllthfqmaxcejecws:Restaurant_db%2F2026@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ];

  for (const connStr of hosts) {
    const shortStr = connStr.replace(/:[^:@]+@/, ':***@');
    console.log(`\nProbando: ${shortStr}`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log('✅ ¡CONECTADO!');
      
      // Check tables
      const res = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `);
      console.log('\n📋 Tablas en public schema:');
      if (res.rows.length === 0) {
        console.log('  ⚠️  No hay tablas. Necesitas ejecutar schema.sql');
      } else {
        res.rows.forEach(r => console.log('  ✅', r.tablename));
      }

      // Check RLS policies
      const rlsRes = await client.query(`
        SELECT tablename, policyname FROM pg_policies 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `);
      console.log('\n🔒 Políticas RLS:');
      if (rlsRes.rows.length === 0) {
        console.log('  ⚠️  No hay políticas RLS activas.');
      } else {
        rlsRes.rows.forEach(r => console.log(`  🛡️  ${r.tablename}: ${r.policyname}`));
      }
      
      await client.end();
      return; // success
    } catch (e) {
      console.log('  ❌', e.message);
      try { await client.end(); } catch {}
    }
  }

  console.log('\n📌 SOLUCIÓN REQUERIDA:');
  console.log('La tabla "usuarios" existe pero necesita que ejecutes el schema.sql completo.');
  console.log('Las políticas RLS que permiten acceso al rol "anon" aún no están activas.\n');
  console.log('👉 Ve a: https://supabase.com/dashboard/project/sgzzllthfqmaxcejecws/sql/new');
  console.log('   Pega el contenido de C:\\Restaurant\\schema.sql y haz clic en "Run"\n');
  
  // Generate a simplified SQL fix just for RLS
  const rlsFix = `
-- CORRECCIÓN RÁPIDA: Otorgar permisos a las tablas existentes
-- Ejecuta esto en el SQL Editor de Supabase si las tablas ya existen

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Deshabilitar RLS temporalmente para testing
ALTER TABLE IF EXISTS usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ordenes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orden_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recepciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recepcion_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kardex DISABLE ROW LEVEL SECURITY;
`;

  fs.writeFileSync('C:/Restaurant/fix_permissions.sql', rlsFix);
  console.log('✅ Archivo "fix_permissions.sql" creado. Puedes ejecutarlo en Supabase SQL Editor.');
}

main().catch(console.error);
