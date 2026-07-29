// FASE 3B (versión sin push): los 4 avisos del handoff calculados EN
// LA APP con los datos que ya viajan (eventos, cuotas, leads). El
// push de verdad (que vibra con la app cerrada) llega con la
// migración 45 — este mismo motor se moverá al backend entonces.
// Lo leído se recuerda por navegador (localStorage).
import { clp, fechaRelativa, hoyISO, soloFecha } from "./formato";
import { Cuota, Evento, cuotaVencida } from "../services/datos";

export interface Aviso {
  id: string;
  tipo: "vencido" | "evento" | "solicitud" | "frio";
  titulo: string;
  detalle: string;
  destino: string;
}

const CLAVE = "eventia_avisos_leidos";

export const leidosGuardados = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) || "[]"));
  } catch {
    return new Set();
  }
};

export const guardarLeidos = (leidos: Set<string>) =>
  localStorage.setItem(CLAVE, JSON.stringify([...leidos].slice(-300)));

export const calcularAvisos = (
  eventos: Evento[],
  cuotas: Cuota[],
  leads: Evento[],
): Aviso[] => {
  const hoy = hoyISO();
  const avisos: Aviso[] = [];
  const porId = new Map(eventos.map((e) => [e.id, e]));

  // 1. Pago vencido
  cuotas.forEach((c) => {
    const e = porId.get(c.quotation_id);
    if (!e || !["aceptada", "realizada"].includes(e.quotation_status)) return;
    if (cuotaVencida(c, hoy)) {
      avisos.push({
        id: `vencido-${c.id}-${soloFecha(c.due_date)}`,
        tipo: "vencido",
        titulo: `Pago vencido — ${e.clients?.name ?? "cliente"}`,
        detalle: `Cuota ${c.payment_number} por ${clp(c.amount - c.paid_amount)} venció ${fechaRelativa(c.due_date)}`,
        destino: `/evento/${e.id}`,
      });
    }
  });

  // 2. Evento mañana / próximos 3 días
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const limiteISO = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
  eventos
    .filter((e) => ["aceptada", "realizada"].includes(e.quotation_status))
    .filter((e) => {
      const f = soloFecha(e.event_date);
      return f >= hoy && f <= limiteISO;
    })
    .forEach((e) => {
      avisos.push({
        id: `evento-${e.id}-${soloFecha(e.event_date)}`,
        tipo: "evento",
        titulo: `Evento ${fechaRelativa(e.event_date).toLowerCase()} — ${e.clients?.name ?? ""}`,
        detalle: [e.event_type, e.people_count && `${e.people_count} personas`]
          .filter(Boolean)
          .join(" · "),
        destino: `/evento/${e.id}`,
      });
    });

  // 3. Nueva solicitud
  leads
    .filter((l) => l.quotation_status === "solicitada")
    .forEach((l) => {
      avisos.push({
        id: `solicitud-${l.id}`,
        tipo: "solicitud",
        titulo: `Nueva solicitud — ${l.contact_name || l.clients?.name || ""}`,
        detalle: [l.event_type, l.people_count && `${l.people_count} personas`]
          .filter(Boolean)
          .join(" · "),
        destino: "/leads",
      });
    });

  // 4. Cotización sin respuesta hace 7+ días
  const hace7 = Date.now() - 7 * 86400000;
  eventos
    .filter((e) => e.quotation_status === "enviada")
    .filter((e) => new Date(e.created_at).getTime() < hace7)
    .forEach((e) => {
      const dias = Math.floor(
        (Date.now() - new Date(e.created_at).getTime()) / 86400000,
      );
      avisos.push({
        id: `frio-${e.id}`,
        tipo: "frio",
        titulo: `Sin respuesta hace ${dias} días — ${e.clients?.name ?? ""}`,
        detalle: `Cotización N° ${e.quotation_number} sigue Enviada — ¿un llamado?`,
        destino: `/evento/${e.id}`,
      });
    });

  return avisos;
};
