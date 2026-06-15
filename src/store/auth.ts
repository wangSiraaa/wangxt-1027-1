import { create } from 'zustand';
import api from '../api/client';

export type Role = 'resident' | 'doctor' | 'admin' | '';

export interface UserInfo {
  userId: string;
  role: Role;
  refId: string;
  name: string;
  token?: string;
}

interface AppState {
  user: UserInfo | null;
  currentRole: Role;
  setUser: (u: UserInfo | null) => void;
  logout: () => void;
  login: (role: Role, identifier: string, password: string) => Promise<boolean>;
}

const stored = localStorage.getItem('contract-user');
const initial = stored ? (JSON.parse(stored) as UserInfo) : null;

export const useAuth = create<AppState>((set) => ({
  user: initial,
  currentRole: initial?.role || '',
  setUser: (u) => {
    set({ user: u, currentRole: u?.role || '' });
    if (u) localStorage.setItem('contract-user', JSON.stringify(u));
    else localStorage.removeItem('contract-user');
  },
  logout: () => {
    set({ user: null, currentRole: '' });
    localStorage.removeItem('contract-user');
  },
  login: async (role, identifier, password) => {
    const r = await api.post('/auth/login', { role, identifier, password });
    if (r.code === 0 && r.data) {
      const { token, user } = r.data as any;
      const info: UserInfo = {
        userId: user.userId || user.id,
        role: user.role,
        refId: user.refId,
        name: user.name,
        token,
      };
      set({ user: info, currentRole: info.role });
      localStorage.setItem('contract-user', JSON.stringify(info));
      return true;
    }
    return false;
  },
}));

const savedRole = localStorage.getItem('contract-demo-role');
if (savedRole && !initial) {
  const demos: any = {
    resident: { userId: 'USR001', role: 'resident', refId: 'RES001', name: '张三' },
    doctor: { userId: 'USR007', role: 'doctor', refId: 'DOC001', name: '张医生' },
    admin: { userId: 'USR011', role: 'admin', refId: 'ADMIN001', name: '系统管理员' },
  };
  if (demos[savedRole]) {
    localStorage.setItem('contract-user', JSON.stringify(demos[savedRole]));
  }
}
