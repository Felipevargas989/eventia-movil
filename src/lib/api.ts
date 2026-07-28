import axios from "axios";
import { supabase } from "./supabase";

// Mismo patrón que services/api.ts del sistema grande: el token de la
// sesión viaja en cada petición; 401 intenta refrescar una vez.
export const api = axios.create({
  baseURL: import.meta.env.VITE_EVENTIA_API_REST,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const {
        data: { session },
      } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        original.headers.Authorization = `Bearer ${session.access_token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export const apiRequest = async <T>(
  url: string,
  method: string,
  data?: unknown,
  params?: unknown,
): Promise<T> => {
  const response = await api.request({ url, method, data, params });
  return response.data as T;
};
