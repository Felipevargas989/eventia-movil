import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Share } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Logo from "../components/Logo";
import { clp, fechaRelativa } from "../lib/formato";
import { getCotizacion } from "../services/datos";

// Bloque D del handoff: ver el detalle de la cotización y
// compartir/descargar el PDF. El botón usa el diálogo NATIVO del
// teléfono (imprimir → guardar PDF / compartir) sobre esta misma
// pantalla, que trae estilos de impresión limpios.
export default function Detalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["cotizacion", id],
    queryFn: () => getCotizacion(id!),
    enabled: !!id,
  });
  const c = q.data;

  if (q.isPending) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-[14px]"></div>
        <div className="h-64 bg-gray-200 rounded-[14px]"></div>
      </div>
    );
  }
  if (!c) {
    return (
      <p className="text-center text-sm text-gray-400 pt-16">
        No se encontró la cotización.
      </p>
    );
  }

  const propina = c.tip_amount || 0;

  return (
    <div className="px-4 pt-3 pb-8 space-y-3">
      <style>{`
        @media print {
          .no-imprimir { display: none !important; }
          nav, header { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="no-imprimir flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>

      <div className="bg-white border border-gray-100 rounded-[14px] p-5 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-sora font-extrabold text-lg text-[#0B1F33]">
              Eventia
            </span>
          </div>
          <span className="text-[13px] font-bold text-gray-400">
            Cotización N° {c.quotation_number}
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">
          {c.clients?.name ?? "—"}
        </p>
        <p className="text-sm text-gray-500">
          {[c.event_type, fechaRelativa(c.event_date), c.people_count && `${c.people_count} personas`]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {(c.items?.variable_services ?? []).map((caja, i) => (
          <div key={i} className="mt-4">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
              {(caja as { category?: string }).category ?? "Servicios"}
              {caja.people ? ` · ${caja.people} personas` : ""}
            </p>
            <div className="divide-y divide-gray-50">
              {(caja.items ?? []).map((it, j) => (
                <div key={j} className="flex justify-between py-1.5 text-[13px]">
                  <span className="text-gray-700 min-w-0 pr-3 truncate">
                    {it.nombre}
                    {(it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : ""}
                  </span>
                  <span className="text-gray-500 tabular-nums shrink-0">
                    {(it as { precio?: number }).precio
                      ? clp((it as { precio?: number }).precio!)
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {(c.items?.fixed_services ?? []).length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
              Servicios fijos
            </p>
            <div className="divide-y divide-gray-50">
              {(c.items?.fixed_services ?? []).map((it, j) => (
                <div key={j} className="flex justify-between py-1.5 text-[13px]">
                  <span className="text-gray-700 min-w-0 pr-3 truncate">
                    {it.nombre}
                  </span>
                  <span className="text-gray-500 tabular-nums shrink-0">
                    {(it as { precio?: number }).precio
                      ? clp((it as { precio?: number }).precio!)
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 mt-4 pt-3 space-y-1 text-[14px]">
          {c.subtotal_amount > 0 && c.subtotal_amount !== c.total_amount && (
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{clp(c.subtotal_amount)}</span>
            </div>
          )}
          {(c.discount_amount || 0) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>
                Descuento
                {c.discount_percentage ? ` (${c.discount_percentage}%)` : ""}
              </span>
              <span className="tabular-nums">-{clp(c.discount_amount)}</span>
            </div>
          )}
          {propina > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Propina{c.tip_percentage ? ` (${c.tip_percentage}%)` : ""}</span>
              <span className="tabular-nums">{clp(propina)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-gray-900 text-[16px]">
            <span>Total</span>
            <span className="tabular-nums">{clp(c.total_amount)}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="no-imprimir w-full py-3.5 bg-blue-600 text-white font-bold rounded-[14px] shadow-lg flex items-center justify-center gap-2"
      >
        <Share size={17} /> Compartir / guardar PDF
      </button>
      <p className="no-imprimir text-center text-[11px] text-gray-400">
        Se abre el diálogo del teléfono: ahí eliges Guardar como PDF,
        AirDrop, WhatsApp o imprimir.
      </p>
    </div>
  );
}
