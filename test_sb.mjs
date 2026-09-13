import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const SUPABASE_URL = 'https://sgzzllthfqmaxcejecws.supabase.co';
const ANON_KEY = 'sb_publishable_j8mMyDU38rbE7F34vsUdTg_w54sOP-Z';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const email = 'admin@restaurant.com';
const hash = createHash('sha256').update('admin123').digest('hex');
console.log('Hash:', hash);

const { data: all, error: e1 } = await supabase.from('usuarios').select('email, rol, activo');
console.log('TEST 1 - Todos los usuarios:', JSON.stringify(all), 'Error:', JSON.stringify(e1));

const { data, error } = await supabase.from('usuarios').select('*').eq('email', email).eq('password_hash', hash).eq('activo', true).single();
console.log('TEST 2 - Login query:', JSON.stringify(data), 'Error:', JSON.stringify(error));
