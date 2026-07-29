import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChefHat,
  ChevronLeft,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChipEstado from "../components/ChipEstado";
import CambiarEstado from "../components/CambiarEstado";
import RegistrarPago from "../components/RegistrarPago";
import { clp, fechaRelativa, hoyISO } from "../lib/formato";
import { cuotaVencida, getEventos, getPagos } from "../services/datos";

// Pantalla 5 del handoff (Fase 1 = solo lectura): datos, contacto con
// llamar/WhatsApp, y pagos con cuotas y abonos. El botón "Registrar
// pago" llega en la Fase 2.
export default function Evento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [estadoAbierto, setEstadoAbierto] = useState(false);
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

  const evento = (eventosQuery.data ?? []).find((e) => e.id === id);
  const cuotas = (pagosQuery.data ?? [])
    .filter((c) => c.quotation_id === id)
    .sort((a, b) => a.payment_number - b.payment_number);
  const hoy = hoyISO();

  const total = evento?.total_amount ?? 0;
  const pagado = cuotas.reduce((s, c) => s + (c.paid_amount || 0), 0);
  const saldo = Math.max(0, total - pagado);
  const hayVencida = cuotas.some((c) => cuotaVencida(c, hoy));

  const telefono =
    evento?.clients?.phone ||
    evento?.clients?.client_contacts?.[0]?.phone ||
    null;
  const contacto =
    evento?.contact_name ||
    evento?.clients?.contact_person ||
    evento?.clients?.client_contacts?.[0]?.name ||
    evento?.clients?.name ||
    "—";
  const soloDigitos = (t: string) => t.replace(/[^0-9+]/g, "");

  if (eventosQuery.isPending) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-28 bg-gray-200 rounded-[14px]"></div>
        <div className="h-24 bg-gray-200 rounded-[14px]"></div>
        <div className="h-40 bg-gray-200 rounded-[14px]"></div>
      </div>
    );
  }
  if (!evento) {
    return (
      <p className="text-center text-sm text-gray-400 pt-16">
        No se encontró el evento.
      </p>
    );
  }

  return (
    <div className="px-4 pt-3 pb-24 space-y-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>

      <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        <div className="flex items-center justify-between mb-1">
          <ChipEstado estado={evento.quotation_status} />
          <span className="text-xs text-gray-400">
            Cotización N° {evento.quotation_number}
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">
          {evento.clients?.name ?? "—"}
        </p>
        {evento.event_type && (
          <p className="text-sm text-gray-500">{evento.event_type}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Calendar size={15} className="text-blue-600" />
            {fechaRelativa(evento.event_date)}
          </span>
          {evento.people_count ? (
            <span className="flex items-center gap-1.5">
              <Users size={15} className="text-blue-600" />
              {evento.people_count} personas
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Contacto (mandante)
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{contacto}</p>
            {telefono && <p className="text-sm text-gray-500">{telefono}</p>}
          </div>
          {telefono && (
            <div className="flex gap-2">
              <a
                href={`tel:${soloDigitos(telefono)}`}
                className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center"
                aria-label="Llamar"
              >
                <Phone size={18} className="text-blue-600" />
              </a>
              <a
                href={`https://wa.me/${soloDigitos(telefono).replace("+", "")}`}
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center"
                aria-label="WhatsApp"
              >
                <MessageCircle size={18} className="text-green-600" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Pagos
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900 tabular-nums">{clp(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pagado</span>
            <span className="font-bold text-[#15803d] tabular-nums">{clp(pagado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Saldo</span>
            <span
              className={`font-bold ${hayVencida ? "text-[#b91c1c]" : "text-gray-900"}`}
            >
              {clp(saldo)}
            </span>
          </div>
        </div>

        {cuotas.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-2 space-y-1.5">
            {cuotas.map((c) => {
              const vencida = cuotaVencida(c, hoy);
              const pagada = c.status === "pagado" || c.paid_amount >= c.amount;
              const color = pagada
                ? "text-[#15803d]"
                : vencida
                  ? "text-[#b91c1c]"
                  : "text-gray-500";
              return (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 py-1"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-700 leading-snug">
                      {c.notes || `Cuota ${c.payment_number}`}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      vence {fechaRelativa(c.due_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[12px] font-bold ${color}`}>
                      {pagada ? "Pagada" : vencida ? "Vencida" : "Pendiente"}
                    </p>
                    <p className="text-[14px] font-bold text-gray-900 tabular-nums">
                      {clp(c.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cuotas.some((c) => c.transactions?.length) && (
          <div className="mt-3 border-t border-gray-100 pt-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              Abonos registrados
            </p>
            {cuotas
              .flatMap((c) => c.transactions ?? [])
              .sort((a, b) =>
                (a.transaction_date || "").localeCompare(b.transaction_date || ""),
              )
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-0.5 text-[13px]"
                >
                  <span className="text-gray-500 truncate">
                    {fechaRelativa(t.transaction_date)} · {t.payment_method}
                  </span>
                  <span className="font-bold text-gray-800 tabular-nums shrink-0">
                    {clp(t.amount)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(`/evento/${evento.id}/detalle`)}
        className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-[14px] px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,.05)]"
      >
        <span className="text-[14px] font-semibold text-gray-900">
          Cotización N° {evento.quotation_number}
        </span>
        <span className="text-[13px] font-semibold text-blue-600">
          Ver detalle y compartir PDF →
        </span>
      </button>

      {["aceptada", "realizada"].includes(evento.quotation_status) && (
        <button
          type="button"
          onClick={() => navigate(`/evento/${evento.id}/cocina`)}
          className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-[14px] px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,.05)]"
        >
          <span className="text-[14px] font-semibold text-gray-900 flex items-center gap-2">
            <ChefHat size={17} className="text-gray-600" /> Ficha de cocina
          </span>
          <span className="text-[13px] font-semibold text-blue-600">
            Ver →
          </span>
        </button>
      )}

      {!["aceptada", "realizada"].includes(evento.quotation_status) && (
        <>
          <p className="text-center text-xs text-gray-400">
            El registro de pagos se habilita cuando la cotización pasa a
            Aceptada.
          </p>
          <div className="fixed bottom-[76px] inset-x-0 px-4 z-30">
            <button
              type="button"
              onClick={() => setEstadoAbierto(true)}
              className="w-full py-3.5 border-2 border-blue-600 text-blue-600 bg-white font-bold rounded-[14px] shadow-lg"
            >
              Cambiar estado
            </button>
          </div>
        </>
      )}

      {estadoAbierto && (
        <CambiarEstado
          evento={evento}
          onCerrar={() => setEstadoAbierto(false)}
        />
      )}

      {["aceptada", "realizada"].includes(evento.quotation_status) &&
        saldo > 0 && (
          <div className="fixed bottom-[76px] inset-x-0 px-4 z-30">
            <button
              type="button"
              onClick={() => setPagoAbierto(true)}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-[14px] shadow-lg"
            >
              Registrar pago
            </button>
          </div>
        )}

      {pagoAbierto && (
        <RegistrarPago
          evento={evento}
          cuotas={cuotas}
          saldo={saldo}
          onCerrar={() => setPagoAbierto(false)}
        />
      )}
    </div>
  );
}
