import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChipEstado from "../components/ChipEstado";
import { fechaRelativa, hoyISO, soloFecha } from "../lib/formato";
import { getEventos } from "../services/datos";

// Pantalla 4 del handoff: segmentos Hoy/Semana/Mes + tarjetas de
// evento. Los eventos SON cotizaciones (aceptada/realizada) con fecha.
type Segmento = "hoy" | "semana" | "mes";

export default function Agenda() {
  const navigate = useNavigate();
  const [segmento, setSegmento] = useState<Segmento>("hoy");
  const eventosQuery = useQuery({
    queryKey: ["eventos"],
    queryFn: getEventos,
    staleTime: 60 * 1000,
  });

  const filtrados = useMemo(() => {
    const todos = (eventosQuery.data ?? []).filter((e) => e.event_date);
    const hoy = hoyISO();
    const fin = new Date();
    if (segmento === "semana") fin.setDate(fin.getDate() + 7);
    if (segmento === "mes") fin.setMonth(fin.getMonth() + 1);
    const finISO = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;
    return todos
      .filter((e) => {
        const inicio = soloFecha(e.event_date);
        const cierre = soloFecha(e.event_end_date) || inicio;
        // El evento aparece si su rango toca el segmento (multi-día
        // incluido): aún no termina y ya partió dentro del límite.
        return cierre >= hoy && inicio <= (segmento === "hoy" ? hoy : finISO);
      })
      .sort((a, b) =>
        soloFecha(a.event_date).localeCompare(soloFecha(b.event_date)),
      );
  }, [eventosQuery.data, segmento]);

  return (
    <div className="px-4 pt-3 space-y-3">
      <div className="bg-gray-100 rounded-[10px] p-1 flex">
        {(
          [
            ["hoy", "Hoy"],
            ["semana", "Esta semana"],
            ["mes", "Este mes"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setSegmento(valor)}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              segmento === valor
                ? "bg-white shadow text-gray-900"
                : "text-gray-500"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {eventosQuery.isPending && (
        <div className="space-y-3 animate-pulse pt-2">
          <div className="h-24 bg-gray-200 rounded-[14px]"></div>
          <div className="h-24 bg-gray-200 rounded-[14px]"></div>
        </div>
      )}

      {!eventosQuery.isPending && filtrados.length === 0 && (
        <p className="text-center text-sm text-gray-400 pt-16">
          Sin eventos en este período.
        </p>
      )}

      {filtrados.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => navigate(`/evento/${e.id}`)}
          className="w-full text-left bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-600">
              {fechaRelativa(e.event_date)}
              {e.event_end_date &&
                soloFecha(e.event_end_date) !== soloFecha(e.event_date) &&
                ` → ${fechaRelativa(e.event_end_date)}`}
            </span>
            <ChipEstado estado={e.quotation_status} />
          </div>
          <p className="text-base font-bold text-gray-900">
            {e.clients?.name ?? "—"}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
            {e.event_type && <span>{e.event_type}</span>}
            {e.people_count ? (
              <span className="flex items-center gap-1">
                <Users size={12} /> {e.people_count} personas
              </span>
            ) : null}
            {e.observations ? (
              <span className="flex items-center gap-1 truncate max-w-[40%]">
                <MapPin size={12} />
                <span className="truncate">{e.observations}</span>
              </span>
            ) : null}
          </p>
        </button>
      ))}
    </div>
  );
}
