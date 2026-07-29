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


// ---------------- FASE 2: registrar un abono ------------------------
// TODA la lógica de plata vive en el backend: el endpoint "overflow"
// (el mismo del computador) reparte el monto entre las cuotas y
// devuelve la distribución. El teléfono solo entrega monto, método y
// comprobante (que entra por la puerta segura /storage).
import { api } from "../lib/api";

export interface ResultadoAbono {
  total: number;
  distribution: {
    payment_id: string;
    payment_number: number;
    amount: number;
    fully_paid: boolean;
  }[];
}

export const registrarAbono = async (params: {
  quotationId: string;
  primerPagoId: string;
  monto: number;
  metodo: string;
  comprobante: File | null;
}): Promise<ResultadoAbono> => {
  let receipt_photo_url: string | undefined;
  if (params.comprobante) {
    const form = new FormData();
    form.append("file", params.comprobante);
    form.append("kind", "payment-receipt");
    form.append("quotation_id", params.quotationId);
    form.append("payment_id", params.primerPagoId);
    const { data } = await api.request({
      url: "/storage/upload",
      method: "POST",
      data: form,
      headers: { "Content-Type": undefined },
    });
    receipt_photo_url = (data as { url: string }).url;
  }
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  return apiRequest<ResultadoAbono>("/payments/transactions/overflow", "POST", {
    quotation_id: params.quotationId,
    amount: params.monto,
    payment_method: params.metodo,
    transaction_date: fecha,
    notes: "Registrado desde Eventia Móvil",
    ...(receipt_photo_url ? { receipt_photo_url } : {}),
  });
};
