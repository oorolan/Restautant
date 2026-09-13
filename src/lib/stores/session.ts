import { writable, derived } from 'svelte/store';

export interface Usuario {
  id: string;
  nombre: string;
  username?: string;
  email: string;
  rol: 'admin' | 'jefe_almacen' | 'empleado';
  activo: boolean;
}

export interface SessionState {
  usuario: Usuario | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: SessionState = {
  usuario: null,
  loading: false,
  initialized: false,
};

export const session = writable<SessionState>(initialState);

// Derived: is authenticated?
export const isAuthenticated = derived(session, ($s) => !!$s.usuario);

// Derived: current user
export const currentUser = derived(session, ($s) => $s.usuario);

// Derived: role helpers
export const isAdmin = derived(session, ($s) => $s.usuario?.rol === 'admin');
export const isJefeAlmacen = derived(session, ($s) =>
  $s.usuario?.rol === 'admin' || $s.usuario?.rol === 'jefe_almacen'
);

// Current active route
export const currentRoute = writable<string>('almacen');

// Global notification store
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const notifications = writable<Notification[]>([]);

export function notify(type: Notification['type'], message: string) {
  const id = crypto.randomUUID();
  notifications.update((n) => [...n, { id, type, message }]);
  setTimeout(() => {
    notifications.update((n) => n.filter((x) => x.id !== id));
  }, 4000);
}
