import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronLeft,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { clp, fechaRelativa } from "../lib/formato";
import { Evento, cambiarEstado, getLeads } from "../services/datos";

// Pantallas 9 del handoff: Leads (nuevas solicitudes + atendidas) y
// la ficha del lead con WhatsApp/Llamar y "Marcar como atendida"
// (= pasa a Enviada con el PATCH existente). Fuente:
// quotations request_type=requerimiento.
const haceCuanto = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "hace minutos";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
};

export default function Leads() {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState<Evento | null>(null);
  const [enviando, setEnviando] = useState(false);
  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
    staleTime: 60 * 1000,
  });

  const { nuevas, atendidas } = useMemo(() => {
    const todas = leadsQuery.data ?? [];
    return {
      nuevas: todas.filter((l) => l.quotation_status === "solicitada"),
      atendidas: todas.filter((l) => l.quotation_status !== "solicitada"),
    };
  }, [leadsQuery.data]);

  const marcarAtendida = async (lead: Evento) => {
    if (enviando) return;
    setEnviando(true);
    try {
      await cambiarEstado(lead.id, "enviada");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setAbierto(null);
    } finally {
      setEnviando(false);
    }
  };

  if (abierto) {
    const telefono =
      abierto.clients?.phone ||
      abierto.clients?.client_contacts?.[0]?.phone ||
      null;
    const digitos = (telefono || "").replace(/[^0-9+]/g, "");
    return (
      <div className="px-4 pt-3 pb-8 space-y-3">
        <button
          type="button"
          onClick={() => setAbierto(null)}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
        >
          <ChevronLeft size={18} /> Volver
        </button>
        <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">
            vía enlace público · {haceCuanto(abierto.created_at)}
          </p>
          <p className="text-lg font-bold text-gray-900">
            {abierto.contact_name || abierto.clients?.name || "—"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {abierto.event_type && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold">
                {abierto.event_type}
              </span>
            )}
            {abierto.people_count ? (
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[12px] font-semibold flex items-center gap-1">
                <Users size={12} /> {abierto.people_count}
              </span>
            ) : null}
            {abierto.event_date && (
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[12px] font-semibold flex items-center gap-1">
                <Calendar size={12} /> {fechaRelativa(abierto.event_date)}
              </span>
            )}
            {abierto.total_amount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[12px] font-semibold tabular-nums">
                {clp(abierto.total_amount)}
              </span>
            )}
          </div>
          {abierto.observations && (
            <blockquote className="mt-3 border-l-2 border-gray-200 pl-3 text-[13px] text-gray-600 italic">
              “{abierto.observations}”
            </blockquote>
          )}
        </div>

        {telefono && (
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/${digitos.replace("+", "")}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 bg-[#16a34a] text-white font-bold rounded-[14px] text-center flex items-center justify-center gap-2"
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
            <a
              href={`tel:${digitos}`}
              className="py-3 border border-blue-600 text-blue-600 font-bold rounded-[14px] text-center flex items-center justify-center gap-2"
            >
              <Phone size={17} /> Llamar
            </a>
          </div>
        )}

        {abierto.quotation_status === "solicitada" && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => marcarAtendida(abierto)}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-[14px] disabled:opacity-45"
          >
            {enviando ? "Guardando…" : "Marcar como atendida"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-6 space-y-3">
      {leadsQuery.isPending && (
        <div className="space-y-3 animate-pulse pt-2">
          <div className="h-20 bg-gray-200 rounded-[14px]"></div>
          <div className="h-20 bg-gray-200 rounded-[14px]"></div>
        </div>
      )}

      {!leadsQuery.isPending && nuevas.length === 0 && atendidas.length === 0 && (
        <p className="text-center text-sm text-gray-400 pt-16">
          Sin solicitudes por ahora.
        </p>
      )}

      {nuevas.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wide pt-1">
            Nuevas solicitudes
          </p>
          {nuevas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setAbierto(l)}
              className="w-full text-left bg-white border border-[#bfdbfe] rounded-[14px] px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,.05)] flex items-start gap-3"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {l.contact_name || l.clients?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {[l.event_type, l.people_count && `${l.people_count} personas`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </button>
          ))}
        </>
      )}

      {atendidas.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-1">
            Atendidas
          </p>
          {atendidas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setAbierto(l)}
              className="w-full text-left bg-white border border-gray-100 rounded-[14px] px-4 py-3.5 opacity-75 flex items-start gap-3"
            >
              <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {l.contact_name || l.clients?.name || "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {[l.event_type, l.people_count && `${l.people_count} personas`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
