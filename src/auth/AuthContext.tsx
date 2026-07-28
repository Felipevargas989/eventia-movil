import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";

// Mismos usuarios y permisos del sistema del computador: la sesión es
// de Supabase y el perfil (cargo + empresa) lo entrega el backend por
// la puerta existente GET /users/:id.
export interface Perfil {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_id: number;
  companies?: { id: number; name: string } | null;
}

interface AuthValue {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<string | null>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setCargando(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (!s) {
        setPerfil(null);
        setCargando(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    let vivo = true;
    apiRequest<{ data: Perfil }>(`/users/${session.user.id}`, "GET")
      .then((r) => {
        if (vivo) setPerfil(r.data);
      })
      .catch(() => {
        if (vivo) setPerfil(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      perfil,
      cargando,
      entrar: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return error ? error.message : null;
      },
      salir: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, perfil, cargando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera del AuthProvider");
  return ctx;
};
