import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Evento, cambiarEstado } from "../services/datos";
import PlanPagos from "./PlanPagos";

// Pantalla 6 del handoff: bottom sheet de estados. Regla firme:
// aceptada/realizada NO se cambian desde el teléfono (anular es del
// computador). Elegir "Aceptada" abre el Plan de pagos.
const OPCIONES = [
  ["enviada", "Enviada"],
  ["en_negociacion", "En negociación"],
  ["aceptada", "Aceptada"],
  ["rechazada", "Rechazada"],
] as const;

export default function CambiarEstado({
  evento,
  onCerrar,
}: {
  readonly evento: Evento;
  readonly onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planAbierto, setPlanAbierto] = useState(false);

  const elegir = async (estado: string) => {
    if (enviando) return;
    if (estado === "aceptada") {
      setPlanAbierto(true);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await cambiarEstado(evento.id, estado);
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onCerrar();
    } catch {
      setError("No se pudo cambiar el estado. Intenta de nuevo.");
      setEnviando(false);
    }
  };

  if (planAbierto) {
    return <PlanPagos evento={evento} onCerrar={onCerrar} />;
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-[rgba(17,24,39,.45)] flex items-end"
      onClick={onCerrar}
    >
      <div
        className="bg-white w-full rounded-t-[22px] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Cambiar estado</h3>
        <p className="text-xs text-gray-400 mb-4">
          Cotización N° {evento.quotation_number} ·{" "}
          {evento.clients?.name ?? "—"}
        </p>
        <div className="space-y-2">
          {OPCIONES.map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              disabled={enviando || valor === evento.quotation_status}
              onClick={() => elegir(valor)}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border text-[14px] font-semibold disabled:opacity-40 ${
                valor === evento.quotation_status
                  ? "border-blue-600 bg-[#eff6ff] text-gray-900"
                  : "border-gray-200 text-gray-700"
              }`}
            >
              <span>{etiqueta}</span>
              {valor === evento.quotation_status && (
                <Check size={18} className="text-blue-600" />
              )}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">
            {error}
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-3 text-center">
          Anular una cotización se hace desde el computador.
        </p>
      </div>
    </div>
  );
}
