import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clp, fechaRelativa, hoyISO } from "../lib/formato";
import { Cuota, ES_EVENTO, cuotaVencida, getEventos, getPagos } from "../services/datos";

// Pantalla 7 del handoff: resumen Por cobrar / Vencido + secciones
// VENCIDOS y AL DÍA con el saldo por evento y su próxima cuota.
interface FilaCobranza {
  id: string;
  numero: number;
  cliente: string;
  fechaEvento: string | null;
  saldo: number;
  vencido: boolean;
  proxima: Cuota | null;
}

export default function Cobranza() {
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
    const hoy = hoyISO();
    const eventos = eventosQuery.data ?? [];
    const cuotas = pagosQuery.data ?? [];
    const filas: FilaCobranza[] = eventos
      .filter((e) => ES_EVENTO(e.quotation_status))
      .map((e) => {
        const propias = cuotas
          .filter((c) => c.quotation_id === e.id)
          .sort((a, b) => a.payment_number - b.payment_number);
        const pagado = propias.reduce((s, c) => s + (c.paid_amount || 0), 0);
        const saldo = Math.max(0, (e.total_amount || 0) - pagado);
        const pendientes = propias.filter((c) => c.paid_amount < c.amount);
        return {
          id: e.id,
          numero: e.quotation_number,
          cliente: e.clients?.name ?? "—",
          fechaEvento: e.event_date,
          saldo,
          vencido: propias.some((c) => cuotaVencida(c, hoy)),
          proxima: pendientes[0] ?? null,
        };
      })
      .filter((f) => f.saldo > 0);
    const porCobrar = filas.reduce((s, f) => s + f.saldo, 0);
    const vencidos = filas.filter((f) => f.vencido);
    const alDia = filas.filter((f) => !f.vencido);
    const totalVencido = cuotas
      .filter(
        (c) =>
          cuotaVencida(c, hoy) &&
          eventos.some((e) => e.id === c.quotation_id),
      )
      .reduce((s, c) => s + (c.amount - c.paid_amount), 0);
    return { porCobrar, totalVencido, vencidos, alDia };
  }, [eventosQuery.data, pagosQuery.data]);

  const cargando = eventosQuery.isPending || pagosQuery.isPending;

  const Fila = ({ f }: { readonly f: FilaCobranza }) => (
    <button
      type="button"
      onClick={() => navigate(`/evento/${f.id}`)}
      className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-[14px] px-4 py-4 text-left shadow-[0_1px_2px_rgba(16,24,40,.05)]"
    >
      <div className="min-w-0 pr-3">
        <p className="text-[11px] font-bold text-blue-600 mb-0.5">
          Cotización N° {f.numero}
          {f.fechaEvento && (
            <span className="text-gray-400 font-semibold">
              {" "}
              · evento {fechaRelativa(f.fechaEvento)}
            </span>
          )}
        </p>
        <p className="text-[15px] font-bold text-gray-900 truncate">
          {f.cliente}
        </p>
        {f.proxima && (
          <p className="text-[12px] text-gray-400 mt-0.5">
            Próxima cuota vence {fechaRelativa(f.proxima.due_date)} ·{" "}
            {clp(f.proxima.amount - f.proxima.paid_amount)}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase">
          Saldo
        </p>
        <p
          className={`text-[16px] font-extrabold tabular-nums ${
            f.vencido ? "text-[#b91c1c]" : "text-gray-900"
          }`}
        >
          {clp(f.saldo)}
        </p>
      </div>
    </button>
  );

  return (
    <div className="px-4 pt-3 pb-6 space-y-3">
      {cargando ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-[16px]"></div>
          <div className="h-16 bg-gray-200 rounded-[14px]"></div>
          <div className="h-16 bg-gray-200 rounded-[14px]"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-600 rounded-[16px] p-4 text-white">
              <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wide">
                Por cobrar
              </p>
              <p className="text-[20px] font-extrabold tabular-nums leading-tight">
                {clp(datos.porCobrar)}
              </p>
            </div>
            <div className="bg-white border border-[#fecaca] rounded-[16px] p-4">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide">
                Vencido
              </p>
              <p className="text-[20px] font-extrabold tabular-nums text-[#b91c1c] leading-tight">
                {clp(datos.totalVencido)}
              </p>
            </div>
          </div>

          {datos.vencidos.length === 0 && datos.alDia.length === 0 && (
            <div className="text-center pt-16">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
              <p className="font-bold text-gray-900">Nada por cobrar</p>
              <p className="text-sm text-gray-400">
                Todos los eventos están al día.
              </p>
            </div>
          )}

          {datos.vencidos.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-wide pt-1">
                Vencidos
              </p>
              {datos.vencidos.map((f) => (
                <Fila key={f.id} f={f} />
              ))}
            </>
          )}
          {datos.alDia.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-1">
                Al día
              </p>
              {datos.alDia.map((f) => (
                <Fila key={f.id} f={f} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
