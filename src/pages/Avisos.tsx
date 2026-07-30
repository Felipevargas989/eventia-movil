import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Calendar, Snowflake, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState as useEstadoPush } from "react";
import {
  Aviso,
  calcularAvisos,
  guardarLeidos,
  leidosGuardados,
} from "../lib/avisos";
import { activarPush, pushSoportado } from "../lib/push";
import { getEventos, getLeads, getPagos } from "../services/datos";

// Pantalla 10 del handoff: lista con ícono por tipo, negrita si no
// leído, punto azul, "marcar todas" y navegación al detalle.
const ICONOS = {
  vencido: { Icono: AlertCircle, clase: "bg-[#fee2e2] text-[#b91c1c]" },
  evento: { Icono: Calendar, clase: "bg-blue-100 text-blue-700" },
  solicitud: { Icono: UserPlus, clase: "bg-green-100 text-green-700" },
  frio: { Icono: Snowflake, clase: "bg-yellow-100 text-yellow-700" },
} as const;

export default function Avisos() {
  const navigate = useNavigate();
  const eventosQuery = useQuery({ queryKey: ["eventos"], queryFn: getEventos, staleTime: 60 * 1000 });
  const pagosQuery = useQuery({ queryKey: ["pagos"], queryFn: getPagos, staleTime: 60 * 1000 });
  const leadsQuery = useQuery({ queryKey: ["leads"], queryFn: getLeads, staleTime: 60 * 1000 });
  const [leidos, setLeidos] = useState<Set<string>>(leidosGuardados);
  // Las leídas DESAPARECEN de la lista (Felipe 30-07: "si no, es una
  // lista eterna"); este enlace las trae de vuelta para repasar.
  const [mostrarLeidas, setMostrarLeidas] = useState(false);
  const [estadoPush, setEstadoPush] = useEstadoPush<
    "inactivo" | "activando" | "activado" | "denegado" | "error"
  >(
    pushSoportado() && Notification.permission === "granted"
      ? "activado"
      : "inactivo",
  );
  const activar = async () => {
    setEstadoPush("activando");
    setEstadoPush(await activarPush());
  };

  const avisos = useMemo(
    () =>
      calcularAvisos(
        eventosQuery.data ?? [],
        pagosQuery.data ?? [],
        leadsQuery.data ?? [],
      ),
    [eventosQuery.data, pagosQuery.data, leadsQuery.data],
  );

  const abrir = (a: Aviso) => {
    const nuevos = new Set(leidos).add(a.id);
    setLeidos(nuevos);
    guardarLeidos(nuevos);
    navigate(a.destino);
  };

  const marcarTodas = () => {
    const nuevos = new Set([...leidos, ...avisos.map((a) => a.id)]);
    setLeidos(nuevos);
    guardarLeidos(nuevos);
  };

  const cargando =
    eventosQuery.isPending || pagosQuery.isPending || leadsQuery.isPending;
  const noLeidos = avisos.filter((a) => !leidos.has(a.id)).length;
  const visibles = mostrarLeidas
    ? avisos
    : avisos.filter((a) => !leidos.has(a.id));

  return (
    <div className="px-4 pt-3 pb-6 space-y-2">
      {pushSoportado() && estadoPush !== "activado" && (
        <button
          type="button"
          disabled={estadoPush === "activando"}
          onClick={activar}
          className="w-full bg-blue-600 text-white rounded-[14px] px-4 py-3 text-left disabled:opacity-60"
        >
          <span className="block text-[14px] font-bold">
            {estadoPush === "activando"
              ? "Activando notificaciones…"
              : "🔔 Activar notificaciones en este teléfono"}
          </span>
          <span className="block text-[12px] text-blue-100">
            {estadoPush === "denegado"
              ? "Permiso denegado — actívalo en Ajustes del navegador."
              : estadoPush === "error"
                ? "No se pudo activar. Intenta de nuevo."
                : "Pagos vencidos, eventos próximos y solicitudes, aunque la app esté cerrada."}
          </span>
        </button>
      )}
      {noLeidos > 0 && (
        <button
          type="button"
          onClick={marcarTodas}
          className="w-full text-right text-[13px] font-semibold text-blue-600 py-1"
        >
          Marcar todas como leídas
        </button>
      )}
      {avisos.length > noLeidos && (
        <button
          type="button"
          onClick={() => setMostrarLeidas((v) => !v)}
          className="w-full text-right text-[12px] text-gray-400 py-0.5"
        >
          {mostrarLeidas
            ? "Ocultar leídas"
            : `Mostrar leídas (${avisos.length - noLeidos})`}
        </button>
      )}

      {cargando && (
        <div className="space-y-2 animate-pulse pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-[14px]"></div>
          ))}
        </div>
      )}

      {!cargando && visibles.length === 0 && (
        <p className="text-center text-sm text-gray-400 pt-16">
          Sin avisos — todo tranquilo. 🎉
        </p>
      )}

      {visibles.map((a) => {
        const { Icono, clase } = ICONOS[a.tipo];
        const leido = leidos.has(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => abrir(a)}
            className="w-full flex items-start gap-3 bg-white border border-gray-100 rounded-[14px] px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,.05)]"
          >
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${clase}`}
            >
              <Icono size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[14px] truncate ${
                  leido ? "font-medium text-gray-700" : "font-bold text-gray-900"
                }`}
              >
                {a.titulo}
              </span>
              <span className="block text-[12px] text-gray-400 truncate">
                {a.detalle}
              </span>
            </span>
            {!leido && (
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></span>
            )}
          </button>
        );
      })}


    </div>
  );
}
