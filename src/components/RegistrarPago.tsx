import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, FileText, Images, X } from "lucide-react";
import { clp } from "../lib/formato";
import {
  Cuota,
  Evento,
  ResultadoAbono,
  registrarAbono,
} from "../services/datos";

// Pantalla 8 del handoff: bottom sheet de 4 pasos. La lógica de plata
// la hace el backend (overflow); acá solo se elige monto, método y
// comprobante. El comprobante entra por la puerta segura /storage.
const METODOS = ["Transferencia", "Efectivo", "Tarjeta", "Cheque"];

export default function RegistrarPago({
  evento,
  cuotas,
  saldo,
  onCerrar,
}: {
  readonly evento: Evento;
  readonly cuotas: Cuota[];
  readonly saldo: number;
  readonly onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [monto, setMonto] = useState(0);
  const [chip, setChip] = useState<"saldo" | "cuota" | "otro" | null>(null);
  const [otroTexto, setOtroTexto] = useState("");
  const [metodo, setMetodo] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAbono | null>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);
  const inputCamara = useRef<HTMLInputElement>(null);

  const cuotaPendiente = useMemo(
    () => cuotas.find((c) => c.paid_amount < c.amount) ?? null,
    [cuotas],
  );
  const montoCuota = cuotaPendiente
    ? cuotaPendiente.amount - cuotaPendiente.paid_amount
    : 0;

  const elegirOtro = (texto: string) => {
    const digitos = texto.replace(/[^0-9]/g, "");
    setOtroTexto(
      digitos ? new Intl.NumberFormat("es-CL").format(Number(digitos)) : "",
    );
    setMonto(Number(digitos || 0));
    setChip("otro");
  };

  const enviar = async (conComprobante: boolean) => {
    if (!metodo || monto <= 0 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await registrarAbono({
        quotationId: evento.id,
        primerPagoId: cuotaPendiente?.id ?? cuotas[0]?.id ?? "sin-cuota",
        monto,
        metodo,
        comprobante: conComprobante ? archivo : null,
      });
      setResultado(r);
      setPaso(4);
      // El saldo se actualiza en TODA la app (ficha, cobranza, resumen).
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    } catch {
      setError("No se pudo registrar el pago. Revisa la conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const nuevoSaldo = Math.max(0, saldo - monto);

  return (
    <div
      className="fixed inset-0 z-40 bg-[rgba(17,24,39,.45)] flex items-end"
      onClick={paso === 4 ? undefined : onCerrar}
    >
      <div
        className="bg-white w-full rounded-t-[22px] p-5 pb-[max(env(safe-area-inset-bottom),20px)] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>

        {paso === 1 && (
          <>
            <h3 className="text-lg font-bold text-gray-900">
              ¿Cuánto pagó {evento.clients?.name ?? "el cliente"}?
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Saldo actual: {clp(saldo)}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMonto(saldo);
                  setChip("saldo");
                  setOtroTexto("");
                }}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border text-[14px] font-semibold ${
                  chip === "saldo"
                    ? "border-blue-600 bg-[#eff6ff] text-gray-900"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span>Saldo completo</span>
                <span className="text-blue-600 font-bold tabular-nums">
                  {clp(saldo)}
                </span>
              </button>
              {cuotaPendiente && montoCuota > 0 && montoCuota !== saldo && (
                <button
                  type="button"
                  onClick={() => {
                    setMonto(montoCuota);
                    setChip("cuota");
                    setOtroTexto("");
                  }}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border text-[14px] font-semibold ${
                    chip === "cuota"
                      ? "border-blue-600 bg-[#eff6ff] text-gray-900"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <span>Cuota {cuotaPendiente.payment_number} pendiente</span>
                  <span className="text-blue-600 font-bold tabular-nums">
                    {clp(montoCuota)}
                  </span>
                </button>
              )}
              <input
                inputMode="numeric"
                value={otroTexto}
                onChange={(e) => elegirOtro(e.target.value)}
                placeholder="Otro monto (abono en CLP)"
                className={`w-full px-4 py-3 rounded-xl border text-[14px] ${
                  chip === "otro"
                    ? "border-blue-600 bg-[#eff6ff]"
                    : "border-gray-200"
                } focus:outline-none`}
              />
            </div>
            <button
              type="button"
              disabled={monto <= 0}
              onClick={() => setPaso(2)}
              className="w-full mt-4 py-3 bg-blue-600 text-white font-semibold rounded-[14px] disabled:opacity-45"
            >
              Continuar · {monto > 0 ? clp(monto) : "—"}
            </button>
          </>
        )}

        {paso === 2 && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ¿Cómo pagó?
            </h3>
            <div className="space-y-2">
              {METODOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodo(m)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border text-[14px] font-semibold ${
                    metodo === m
                      ? "border-blue-600 bg-[#eff6ff] text-gray-900"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <span>{m}</span>
                  {metodo === m && <Check size={18} className="text-blue-600" />}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!metodo}
              onClick={() => setPaso(3)}
              className="w-full mt-4 py-3 bg-blue-600 text-white font-semibold rounded-[14px] disabled:opacity-45"
            >
              Continuar
            </button>
          </>
        )}

        {paso === 3 && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Comprobante
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {clp(monto)} · {metodo}
            </p>
            <input
              ref={inputGaleria}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
            <input
              ref={inputCamara}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />

            {archivo ? (
              <div className="border border-gray-200 rounded-xl p-3 mb-3 flex items-center gap-3">
                {archivo.type === "application/pdf" ? (
                  <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-red-500" />
                  </div>
                ) : (
                  <img
                    src={URL.createObjectURL(archivo)}
                    alt="Comprobante"
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    {archivo.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setArchivo(null)}
                    className="text-xs text-blue-600 font-semibold"
                  >
                    Cambiar comprobante
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  className="text-gray-300"
                  aria-label="Quitar"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <button
                  type="button"
                  onClick={() => inputGaleria.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-[14px]"
                >
                  <Images size={18} /> Elegir del teléfono (fotos y PDF)
                </button>
                <button
                  type="button"
                  onClick={() => inputCamara.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[14px]"
                >
                  <Camera size={18} /> Tomar foto
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
                {error}
              </p>
            )}

            {archivo ? (
              <button
                type="button"
                disabled={enviando}
                onClick={() => enviar(true)}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-[14px] disabled:opacity-45"
              >
                {enviando ? "Registrando…" : `Registrar pago · ${clp(monto)}`}
              </button>
            ) : (
              <button
                type="button"
                disabled={enviando}
                onClick={() => enviar(false)}
                className="w-full py-2 text-[13px] text-gray-400 font-medium"
              >
                {enviando
                  ? "Registrando…"
                  : "Registrar sin comprobante (no recomendado)"}
              </button>
            )}
          </>
        )}

        {paso === 4 && resultado && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Pago registrado
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {clp(monto)} · {metodo} ·{" "}
              {archivo ? "con comprobante" : "sin comprobante"}
            </p>
            <p
              className={`mt-3 text-[15px] font-bold ${
                nuevoSaldo === 0 ? "text-green-600" : "text-gray-900"
              }`}
            >
              Nuevo saldo: {clp(nuevoSaldo)}
            </p>
            <button
              type="button"
              onClick={onCerrar}
              className="w-full mt-5 py-3 bg-blue-600 text-white font-semibold rounded-[14px]"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
