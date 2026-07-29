import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChipEstado from "../components/ChipEstado";
import { clp, fechaRelativa, hoyISO, soloFecha } from "../lib/formato";
import { cuotaVencida, getEventos, getPagos } from "../services/datos";

// Pantalla 13 del handoff: 3 tarjetas — ventas del mes, por cobrar
// (tap → Cobranza en Fase 2; por ahora informativo) y eventos próximos.
export default function Resumen() {
  const navigate = useNavigate();
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

  const datos = useMemo(() => {
    const eventos = eventosQuery.data ?? [];
    const cuotas = pagosQuery.data ?? [];
    const hoy = hoyISO();
    const mes = hoy.slice(0, 7);

    const delMes = eventos.filter(
      (e) => soloFecha(e.event_date).slice(0, 7) === mes,
    );
    // Venta sin propina — misma regla del Dashboard del computador.
    const ventasMes = delMes.reduce(
      (s, e) => s + (e.total_amount || 0) - (e.tip_amount || 0),
      0,
    );

    const idsEventos = new Set(eventos.map((e) => e.id));
    const pendientes = cuotas.filter(
      (c) => idsEventos.has(c.quotation_id) && c.paid_amount < c.amount,
    );
    const porCobrar = pendientes.reduce(
      (s, c) => s + (c.amount - c.paid_amount),
      0,
    );
    const vencido = pendientes
      .filter((c) => cuotaVencida(c, hoy))
      .reduce((s, c) => s + (c.amount - c.paid_amount), 0);

    const proximos = eventos
      .filter((e) => soloFecha(e.event_date) >= hoy)
      .sort((a, b) =>
        soloFecha(a.event_date).localeCompare(soloFecha(b.event_date)),
      )
      .slice(0, 5);

    return { ventasMes, eventosMes: delMes.length, porCobrar, vencido, proximos };
  }, [eventosQuery.data, pagosQuery.data]);

  const cargando = eventosQuery.isPending || pagosQuery.isPending;

  return (
    <div className="px-4 pt-3 pb-6 space-y-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>
      <h2 className="text-xl font-extrabold text-gray-900">
        Resumen de negocio
      </h2>

      {cargando ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-gray-200 rounded-[16px]"></div>
          <div className="h-20 bg-gray-200 rounded-[16px]"></div>
          <div className="h-40 bg-gray-200 rounded-[16px]"></div>
        </div>
      ) : (
        <>
          <div className="bg-blue-600 rounded-[16px] p-5 text-white shadow">
            <p className="text-[12px] font-semibold text-blue-100 uppercase tracking-wide">
              Ventas del mes
            </p>
            <p className="text-[28px] font-extrabold leading-tight">
              {clp(datos.ventasMes)}
            </p>
            <p className="text-[12px] text-blue-100">
              {datos.eventosMes} eventos aceptados o realizados
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-[16px] p-5 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                  Por cobrar
                </p>
                <p className="text-[22px] font-extrabold text-gray-900">
                  {clp(datos.porCobrar)}
                </p>
              </div>
              {datos.vencido > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                  {clp(datos.vencido)} vencido
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[16px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Eventos próximos
            </p>
            {datos.proximos.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                Sin eventos agendados.
              </p>
            )}
            <div className="divide-y divide-gray-100">
              {datos.proximos.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate(`/evento/${e.id}`)}
                  className="w-full flex items-center justify-between py-2.5 text-left"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-[13px] font-bold text-blue-600">
                      {fechaRelativa(e.event_date)}
                    </p>
                    <p className="text-[14px] font-semibold text-gray-900 truncate">
                      {e.clients?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[e.event_type, e.people_count && `${e.people_count} personas`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ChipEstado estado={e.quotation_status} />
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            El análisis completo vive en el Dashboard del computador.
          </p>
        </>
      )}
    </div>
  );
}
