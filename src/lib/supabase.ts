import { createClient } from "@supabase/supabase-js";

// Misma sesión y usuarios del sistema del computador.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// ¿Corremos contra el LABORATORIO (base espejo)? El letrero ámbar
// del cascarón depende de esto — misma técnica que el sistema grande.
export const ES_LABORATORIO = String(
  import.meta.env.VITE_SUPABASE_URL || "",
).includes("uonjtbyoxawxvhuikbgx");
