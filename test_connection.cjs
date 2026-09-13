const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function testRESTandCreateTables() {
  console.log('🔌 Probando conexión REST a Supabase...\n');

  // 1. Test with anon key
  const testUrl = new URL(`${SUPABASE_URL}/rest/v1/`);
  const testResult = await httpsRequest(testUrl, {
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    }
  });
  console.log('📡 REST status:', testResult.status);

  // 2. Try to read usuarios table to check if it exists
  console.log('\n🔍 Verificando si tablas existen...');
  const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/usuarios?select=count&limit=1`);
  const checkResult = await httpsRequest(checkUrl, {
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Range': '0-0',
    }
  });

  console.log('Usuarios table check status:', checkResult.status);
  console.log('Response:', JSON.stringify(checkResult.body));

  if (checkResult.status === 200) {
    console.log('\n✅ ¡Las tablas YA EXISTEN en Supabase!');
    
    // Try to login with admin credentials
    console.log('\n🔐 Probando login como admin...');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    console.log('SHA-256 de admin123:', hash);
    
    const loginUrl = new URL(`${SUPABASE_URL}/rest/v1/usuarios?email=eq.admin@restaurant.com&password_hash=eq.${hash}&activo=eq.true`);
    const loginResult = await httpsRequest(loginUrl, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    });
    console.log('Login result status:', loginResult.status);
    console.log('Login result:', JSON.stringify(loginResult.body));
  } else if (checkResult.status === 404 || (checkResult.body && checkResult.body.code === '42P01')) {
    console.log('\n❌ Las tablas NO existen todavía. Necesitas ejecutar schema.sql manualmente.');
    console.log('👉 Ve a: https://supabase.com/dashboard/project/sgzzllthfqmaxcejecws/sql/new');
  } else {
    console.log('\n⚠️  Estado inesperado. Respuesta completa:', JSON.stringify(checkResult));
  }

  // 3. Test with service key (should have more privileges)
  console.log('\n🔑 Probando con service key...');
  const svcUrl = new URL(`${SUPABASE_URL}/rest/v1/usuarios?select=nombre,rol&limit=5`);
  const svcResult = await httpsRequest(svcUrl, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  });
  console.log('Service key status:', svcResult.status);
  console.log('Service key response:', JSON.stringify(svcResult.body));
}

testRESTandCreateTables().catch(console.error);
