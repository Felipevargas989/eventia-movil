import { apiRequest } from "../lib/api";

// Fase 1: SOLO puertas existentes del backend. Las formas vienen del
// sistema del computador (paymentTransactions.service, services.service).

export interface Evento {
  id: string;
  quotation_number: number;
  quotation_status: string;
  event_type: string | null;
  event_date: string | null;
  event_end_date: string | null;
  people_count: number | null;
  total_amount: number;
  tip_amount: number | null;
  contact_name: string | null;
  observations: string | null;
  clients: {
    name: string;
    phone: string | null;
    contact_person: string | null;
    client_contacts?: { name: string | null; phone: string | null }[];
  } | null;
}

export const getEventos = async (): Promise<Evento[]> => {
  const data = await apiRequest<Evento[] | { data: Evento[] }>(
    "/quotations",
    "GET",
    undefined,
    {
      request_type: "cotizacion",
      statuses: ["aceptada", "realizada"],
    },
  );
  return Array.isArray(data) ? data : (data.data ?? []);
};

export interface Transaccion {
  id: number;
  amount: number;
  payment_method: string;
  transaction_date: string;
}

export interface Cuota {
  id: string;
  quotation_id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status: string;
  notes: string | null;
  paid_amount: number;
  transactions: Transaccion[];
}

export const getPagos = async (): Promise<Cuota[]> => {
  const r = await apiRequest<Cuota[] | { data: Cuota[] }>(
    "/payments/transactions",
    "GET",
  );
  return Array.isArray(r) ? r : (r.data ?? []);
};

export interface ServicioCatalogo {
  id: number;
  name: string;
  category: string;
  price?: number;
  price_per_person?: number;
  calculation_type?: string;
  is_active?: boolean;
}

export const getCatalogo = async (): Promise<{
  variables: ServicioCatalogo[];
  fijos: ServicioCatalogo[];
}> => {
  const r = await apiRequest<{
    variableServices: ServicioCatalogo[];
    fixedServices: ServicioCatalogo[];
  }>("/services", "GET");
  return {
    variables: (r.variableServices ?? []).filter((s) => s.is_active !== false),
    fijos: (r.fixedServices ?? []).filter((s) => s.is_active !== false),
  };
};

// Cuota vencida (regla del handoff): no pagada, vence antes de hoy y
// lo abonado no la cubre.
export const cuotaVencida = (c: Cuota, hoy: string): boolean =>
  c.status !== "pagado" &&
  (c.due_date || "").split("T")[0] < hoy &&
  c.paid_amount < c.amount;
