import { supabase } from '../supabase';
import type { Usuario } from '../stores/session';
import { localStore } from './mockData';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(username: string, password: string): Promise<Usuario> {
  const hash = await hashPassword(password);
  const cleanUsername = username.toLowerCase().trim();

  // Detect placeholder API key — skip Supabase and go directly to local store
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const supabaseConfigured =
    anonKey &&
    anonKey !== 'your-anon-key-here' &&
    (anonKey.startsWith('eyJ') || anonKey.startsWith('sb_publishable_') || anonKey.startsWith('sb_'));

  // 1. Try Supabase only if the key is configured
  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password_hash', hash)
        .eq('activo', true)
        .single();

      if (!error && data) {
        return data as Usuario;
      }

      // PGRST116 = no rows matched (wrong password or user not found)
      if (error?.code === 'PGRST116') {
        throw new Error('Usuario o contraseña incorrectos.');
      }

      // Any other Supabase error → fall through to local only as last resort
      console.warn('Supabase error en login, usando fallback local:', error?.message, error?.code);
    } catch (err: any) {
      if (err.message?.includes('Usuario o contraseña')) throw err;
      console.warn('Supabase no disponible, usando fallback local:', err);
    }
  } else {
    console.info('Modo Demo: Supabase no configurado, usando datos locales.');
  }

  // 2. Fallback to local store (offline / demo mode)
  const localUsers = localStore.getUsuarios();
  const matched = localUsers.find(u =>
    (u as any).username?.toLowerCase() === cleanUsername ||
    u.email.split('@')[0].toLowerCase() === cleanUsername
  );

  if (matched) {
    const passwordValid =
      matched.password_hash === hash ||
      (cleanUsername === 'admin'    && password === 'admin123') ||
      (cleanUsername === 'lucia'    && password === 'jefe123') ||
      (cleanUsername === 'mateo'    && password === 'emp123');

    if (!passwordValid) throw new Error('Usuario o contraseña incorrectos.');
    if (!matched.activo) throw new Error('Esta cuenta de usuario se encuentra inactiva.');
    return matched as Usuario;
  }

  throw new Error('Usuario no encontrado.');
}

export async function getUsuarios(): Promise<Usuario[]> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre');
    if (!error && data) return data as Usuario[];
  } catch (err) {
    console.warn('Fallback a localStore para getUsuarios');
  }
  return localStore.getUsuarios() as Usuario[];
}

export async function createUsuario(payload: {
  nombre: string;
  username: string;
  email: string;
  password: string;
  rol: string;
}) {
  const hash = await hashPassword(payload.password);
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        nombre: payload.nombre,
        username: payload.username.toLowerCase(),
        email: payload.email.toLowerCase(),
        password_hash: hash,
        rol: payload.rol
      })
      .select()
      .single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Fallback a localStore para createUsuario');
  }

  const list = localStore.getUsuarios();
  const newUser = {
    id: 'usr-' + Date.now(),
    nombre: payload.nombre,
    username: payload.username.toLowerCase(),
    email: payload.email.toLowerCase(),
    password_hash: hash,
    rol: payload.rol as any,
    activo: true
  };
  localStore.setUsuarios([...list, newUser]);
  return newUser;
}

export async function toggleUsuario(id: string, activo: boolean) {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo })
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para toggleUsuario');
  }

  const list = localStore.getUsuarios().map(u => (u.id === id ? { ...u, activo } : u));
  localStore.setUsuarios(list);
}

export async function updateUsuario(id: string, payload: Partial<{ nombre: string; rol: string; activo: boolean }>) {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback a localStore para updateUsuario');
  }

  const list = localStore.getUsuarios().map(u => (u.id === id ? { ...u, ...payload } : u));
  localStore.setUsuarios(list);
}
