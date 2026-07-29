import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  Package,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { calcularAvisos, leidosGuardados } from "../lib/avisos";
import { getEventos, getLeads, getPagos } from "../services/datos";
import { ES_LABORATORIO } from "../lib/supabase";
import Logo from "../components/Logo";

// Pantalla 3 del handoff: header + tab bar + banners. Los badges de
// Leads/Avisos llegan con sus fases.
const TABS = [
  { href: "/", nombre: "Agenda", icono: Calendar },
  { href: "/cobranza", nombre: "Cobranza", icono: Banknote },
  { href: "/leads", nombre: "Leads", icono: Users },
  { href: "/avisos", nombre: "Avisos", icono: Bell },
  { href: "/inventario", nombre: "Inventario", icono: Package },
];

const TITULOS: Record<string, string> = {
  "/": "Agenda",
  "/cobranza": "Cobranza",
  "/leads": "Leads",
  "/avisos": "Avisos",
  "/inventario": "Inventario",
};

export default function AppShell() {
  const { perfil, salir } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  // Badge de Leads: solicitudes nuevas sin atender (60s de frescura).
  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
    staleTime: 60 * 1000,
  });
  const leadsNuevos = (leadsQuery.data ?? []).filter(
    (l) => l.quotation_status === "solicitada",
  ).length;
  // Badge de Avisos: mismos cálculos de la pestaña (comparte caché).
  const eventosQuery = useQuery({
    queryKey: ["eventos"],
    queryFn: getEventos,
    staleTime: 60 * 1000,
  });
  const pagosQuery = useQuery({
    queryKey: ["pagos"],
    queryFn: getPagos,
    staleTime: 60 * 1000,
  });
  const avisosNoLeidos = calcularAvisos(
    eventosQuery.data ?? [],
    pagosQuery.data ?? [],
    leadsQuery.data ?? [],
  ).filter((a) => !leidosGuardados().has(a.id)).length;

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const iniciales = (perfil?.full_name || perfil?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {ES_LABORATORIO && (
        <div className="bg-amber-400 text-amber-950 text-center text-[11px] font-bold py-1 tracking-wide">
          🧪 LABORATORIO — copia de prueba
        </div>
      )}
      {offline && (
        <div className="bg-[#fef3c7] text-[#92400e] text-center text-xs font-semibold py-1.5">
          Sin conexión · mostrando datos guardados
        </div>
      )}

      <header className="bg-white border-b border-gray-100 px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Logo size={20} />
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[.6px]">
              {perfil?.companies?.name || ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/precios")}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Consulta de precios"
            >
              <Search size={18} className="text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/resumen")}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Resumen de negocio"
            >
              <BarChart3 size={18} className="text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => setPerfilAbierto(true)}
              className="w-8 h-8 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center"
            >
              {iniciales}
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
          {TITULOS[location.pathname] ?? ""}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-6">
        <Outlet />
      </main>

      <nav className="shrink-0 bg-white border-t border-[#eef0f3] flex justify-around pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)]">
        {TABS.map((t) => {
          const Icono = t.icono;
          return (
            <NavLink
              key={t.href}
              to={t.href}
              end={t.href === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`
              }
            >
              <span className="relative">
                <Icono size={23} strokeWidth={2} />
                {t.nombre === "Leads" && leadsNuevos > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center">
                    {leadsNuevos}
                  </span>
                )}
                {t.nombre === "Avisos" && avisosNoLeidos > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center">
                    {avisosNoLeidos}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{t.nombre}</span>
            </NavLink>
          );
        })}
      </nav>

      {perfilAbierto && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(17,24,39,.45)] flex items-end"
          onClick={() => setPerfilAbierto(false)}
        >
          <div
            className="bg-white w-full rounded-t-[22px] p-6 pb-[max(env(safe-area-inset-bottom),24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                {iniciales}
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  {perfil?.full_name || "—"}
                </p>
                <p className="text-sm text-gray-500">{perfil?.email}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Rol: <span className="font-semibold">{perfil?.role}</span> ·{" "}
              {perfil?.companies?.name}
            </p>
            <p className="text-xs text-gray-400 mb-5 flex items-center gap-1">
              <UserRound size={12} /> Mismos permisos del sistema del
              computador.
            </p>
            <button
              type="button"
              onClick={salir}
              className="w-full py-3 border border-red-200 text-red-700 font-semibold rounded-[14px]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
