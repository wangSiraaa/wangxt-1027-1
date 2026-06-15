import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

client.interceptors.request.use((cfg) => {
  const u = localStorage.getItem('contract-user');
  if (u) {
    try {
      const user = JSON.parse(u);
      cfg.headers['x-user-id'] = user.userId;
      cfg.headers['x-user-role'] = user.role;
      cfg.headers['x-user-refid'] = user.refId;
      cfg.headers['x-user-name'] = encodeURIComponent(user.name);
      if (user.token) cfg.headers['Authorization'] = `Bearer ${user.token}`;
    } catch {}
  }
  return cfg;
});

client.interceptors.response.use(
  (r) => r.data,
  (e) => Promise.reject(e.response?.data || { code: -1, message: e.message })
);

type ApiResp<T = any> = { code: number; message: string; data?: T };

export const api = {
  get: <T = any>(url: string, params?: any) =>
    client.get<any, ApiResp<T>>(url, { params }) as unknown as Promise<ApiResp<T>>,
  post: <T = any>(url: string, data?: any) =>
    client.post<any, ApiResp<T>>(url, data) as unknown as Promise<ApiResp<T>>,
  put: <T = any>(url: string, data?: any) =>
    client.put<any, ApiResp<T>>(url, data) as unknown as Promise<ApiResp<T>>,
};

export default api;
