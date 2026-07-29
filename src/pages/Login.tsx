import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Logo from "../components/Logo";

// Pantalla 1 del handoff: alta fidelidad (labels 13px/600, inputs
// radius-12, botón azul radius-14). El botón Face ID llega en Fase 5
// (WebAuthn); por ahora no se muestra para no prometer en falso.
export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const err = await entrar(email.trim(), password);
    if (err) setError("Correo o contraseña incorrectos");
    setEnviando(false);
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gray-50 flex flex-col justify-center px-6">
      <div className="max-w-sm w-full mx-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={40} />
          <span className="font-sora font-extrabold text-2xl text-[#0B1F33]">
            Eventia
          </span>
        </div>
        <h1 className="text-center text-xl font-bold text-gray-900 mt-6">
          Iniciar Sesión
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          Accede a tu cuenta de Eventia
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-semibold text-gray-700 mb-1"
            >
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-[14px] py-[13px] border border-gray-300 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="tu@correo.cl"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-[14px] py-[13px] border border-gray-300 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || !email || !password}
            className="w-full py-[13px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[14px] disabled:opacity-45 transition-opacity"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Mismos usuarios y permisos del sistema del computador.
        </p>
      </div>
    </div>
  );
}
