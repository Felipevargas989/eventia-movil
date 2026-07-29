import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { clp, hoyISO } from "../lib/formato";
import { CuotaPlan, Evento, crearPlanPagos } from "../services/datos";

// Pantalla "Plan de pagos" del handoff — misma lógica del
// PaymentPlanEditor del laptop: parte con 1 cuota por el total con
// fecha de hoy; la suma debe CUADRAR EXACTO para habilitar el botón.
// El endpoint /payments/plan (existente) crea las cuotas, deja la
// cotización aceptada y manda el correo — igual que el computador.
export default function PlanPagos({
  evento,
  onCerrar,
}: {
  readonly evento: Evento;
  readonly onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const total = evento.total_amount || 0;
  const [cuotas, setCuotas] = useState<CuotaPlan[]>([
    { label: "Cuota 1", due_date: hoyISO(), amount: total },
  ]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suma = useMemo(
    () => cuotas.reduce((s, c) => s + (c.amount || 0), 0),
    [cuotas],
  );
  const diferencia = total - suma;
  const cuadra =
    diferencia === 0 &&
    cuotas.every((c) => c.amount > 0 && c.due_date && c.label.trim());

  const actualizar = (i: number, campo: Partial<CuotaPlan>) =>
    setCuotas((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...campo } : c)),
    );

  const agregar = () =>
    setCuotas((prev) => [
      ...prev,
      {
        label: `Cuota ${prev.length + 1}`,
        due_date: hoyISO(),
        amount: Math.max(0, diferencia),
      },
    ]);

  const aceptar = async () => {
    if (!cuadra || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await crearPlanPagos(evento.id, cuotas);
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onCerrar();
    } catch {
      setError("No se pudo crear el plan. Intenta de nuevo.");
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-[rgba(17,24,39,.45)] flex items-end"
      onClick={onCerrar}
    >
      <div
        className="bg-white w-full rounded-t-[22px] p-5 pb-[max(env(safe-area-inset-bottom),20px)] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-bold text-gray-900">Plan de pagos</h3>
        <p className="text-xs text-gray-400 mb-4">
          Total de la cotización: {clp(total)}
        </p>

        <div className="space-y-3">
          {cuotas.map((c, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400">
                  {total > 0
                    ? `${Math.round(((c.amount || 0) / total) * 100)}% del total`
                    : "—"}
                </span>
                {cuotas.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCuotas((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-gray-300"
                    aria-label="Eliminar cuota"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input
                value={c.label}
                onChange={(e) => actualizar(i, { label: e.target.value })}
                placeholder="Comentario (ej: Reserva 30%)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[14px]"
              />
              <input
                type="date"
                value={c.due_date}
                onChange={(e) => actualizar(i, { due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[14px] bg-white"
              />
              <input
                inputMode="numeric"
                value={
                  c.amount
                    ? new Intl.NumberFormat("es-CL").format(c.amount)
                    : ""
                }
                onChange={(e) =>
                  actualizar(i, {
                    amount: Number(e.target.value.replace(/[^0-9]/g, "") || 0),
                  })
                }
                placeholder="Monto CLP"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[14px] tabular-nums"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={agregar}
          className="w-full mt-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-[13px] font-semibold text-gray-500 flex items-center justify-center gap-1"
        >
          <Plus size={15} /> Agregar cuota
        </button>

        <p
          className={`text-[13px] font-bold text-center mt-3 ${
            diferencia === 0
              ? "text-[#15803d]"
              : diferencia > 0
                ? "text-[#b45309]"
                : "text-[#b91c1c]"
          }`}
        >
          Suma {clp(suma)} ·{" "}
          {diferencia === 0
            ? "cuadra con el total"
            : diferencia > 0
              ? `falta asignar ${clp(diferencia)}`
              : `sobran ${clp(-diferencia)}`}
        </p>

        {error && (
          <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!cuadra || enviando}
          onClick={aceptar}
          className="w-full mt-3 py-3 bg-[#16a34a] text-white font-bold rounded-[14px] disabled:opacity-45"
        >
          {enviando ? "Guardando…" : "Aceptar plan y cotización"}
        </button>
      </div>
    </div>
  );
}
