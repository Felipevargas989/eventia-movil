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
  created_at: string;
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
      statuses: ["enviada", "en_negociacion", "aceptada", "realizada"],
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


// ---------------- FASE 3A: leads + estado + plan de pagos -----------
export const ES_EVENTO = (estado: string) =>
  estado === "aceptada" || estado === "realizada";

export const getLeads = async (): Promise<Evento[]> => {
  const data = await apiRequest<Evento[] | { data: Evento[] }>(
    "/quotations",
    "GET",
    undefined,
    {
      request_type: "requerimiento",
      statuses: ["solicitada", "enviada", "en_negociacion"],
    },
  );
  return Array.isArray(data) ? data : (data.data ?? []);
};

// Cambiar estado: el mismo PATCH del laptop. La regla del handoff:
// aceptada/realizada NO se cambian desde el teléfono.
export const cambiarEstado = (id: string, estado: string) =>
  apiRequest(`/quotations/${id}`, "PATCH", { quotation_status: estado });

// Plan de pagos al aceptar: el MISMO endpoint del laptop — crea las
// cuotas y deja la cotización aceptada (y manda el correo).
export interface CuotaPlan {
  label: string;
  due_date: string;
  amount: number;
}

export const crearPlanPagos = (quotationId: string, cuotas: CuotaPlan[]) =>
  apiRequest("/payments/plan", "POST", {
    quotation_id: quotationId,
    payments: cuotas.map((c, i) => ({
      quotation_id: quotationId,
      payment_number: i + 1,
      amount: Math.round(c.amount),
      due_date: c.due_date,
      status: "pendiente",
      payment_type: c.label,
      notes: "",
    })),
  });


// ---------------- FASE 4A: inventario -------------------------------
export interface ItemMobiliario {
  id: number;
  name: string;
  category: string;
  stock: number;
  photo_url: string | null;
  is_active: boolean;
}

export interface Insumo {
  id: number;
  name: string;
  unit_family: string;
}

export const getMobiliario = async (): Promise<ItemMobiliario[]> => {
  const r = await apiRequest<ItemMobiliario[]>("/logistics/furniture", "GET");
  return (r ?? []).filter((f) => f.is_active !== false);
};

export const getInsumos = async (): Promise<Insumo[]> => {
  return apiRequest<Insumo[]>("/logistics/supplies", "GET");
};

export const crearMobiliario = (fields: {
  name: string;
  category: string;
  stock: number;
}) => apiRequest<ItemMobiliario>("/logistics/furniture", "POST", fields);

export const actualizarFotoMobiliario = (id: number, photo_url: string) =>
  apiRequest(`/logistics/furniture/${id}`, "PATCH", { photo_url });

// Sube la foto por la puerta segura /storage (balde público de
// mobiliario) y devuelve su URL.
export const subirFotoMobiliario = async (
  itemId: number,
  foto: File,
): Promise<string> => {
  const form = new FormData();
  form.append("file", foto);
  form.append("kind", "furniture-photo");
  form.append("item_id", String(itemId));
  const { data } = await api.request({
    url: "/storage/upload",
    method: "POST",
    data: form,
    headers: { "Content-Type": undefined },
  });
  return (data as { url: string }).url;
};

export const CATEGORIAS_MOBILIARIO: [string, string][] = [
  ["cristaleria", "Cristalería"],
  ["cuchilleria", "Cuchillería"],
  ["vajilla", "Vajilla"],
  ["manteleria", "Mantelería"],
  ["menaje", "Menaje y decoración"],
  ["mobiliario", "Mobiliario"],
  ["otro", "Otro"],
];


// ---------------- FASE 4B: ficha de cocina --------------------------
// El evento CON sus items (fuente del motor de recetas) viene de la
// puerta existente de compras; el catálogo, del paquete Velocidad 2.0.
import type { EventItemsSnapshot } from "../lib/eventConsolidation";
import type {
  FurnitureItem,
  RecipeItem,
  Supply,
} from "../lib/logistics.types";

export interface EventoCompras {
  id: string;
  quotation_number: number;
  client_name?: string;
  people_count: number | null;
  event_date: string | null;
  items: EventItemsSnapshot;
}

export const getEventosCompras = async (): Promise<EventoCompras[]> => {
  const data = await apiRequest<Record<string, unknown>[]>(
    "/logistics/purchasing/accepted-events",
    "GET",
  );
  return (data ?? []).map((q) => ({
    ...(q as unknown as EventoCompras),
    client_name:
      ((q.clients as { name?: string } | null)?.name as string) || "—",
  }));
};

export const getBaseCocina = async (): Promise<{
  recipes: RecipeItem[];
  supplies: Supply[];
  furniture: FurnitureItem[];
  nameIds: { variable: Record<string, number>; fixed: Record<string, number> };
}> => {
  const data = await apiRequest<{
    recipes: RecipeItem[];
    supplies: Supply[];
    furniture: FurnitureItem[];
    nameIds: { variable: { id: number; name: string }[]; fixed: { id: number; name: string }[] };
  }>("/logistics/base-catalogo", "GET");
  // MISMA función canónica del laptop (searchMatch.canonicalServiceName)
  // — si difiere en un espacio, las recetas no calzan.
  const norm = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/^\s*\d+\s*-\s*/, "")
      .replace(/(\d)\s*pp\b/g, "$1 pp")
      .replace(/\s+/g, " ")
      .trim();
  const variable: Record<string, number> = {};
  (data.nameIds?.variable ?? []).forEach((s) => (variable[norm(s.name)] = s.id));
  const fixed: Record<string, number> = {};
  (data.nameIds?.fixed ?? []).forEach((s) => (fixed[norm(s.name)] = s.id));
  return {
    recipes: data.recipes ?? [],
    supplies: data.supplies ?? [],
    furniture: data.furniture ?? [],
    nameIds: { variable, fixed },
  };
};

export const getHorarios = async (
  quotationId: string,
): Promise<Record<string, string>> => {
  const data = await apiRequest<{ service_name: string; start_time: string }[]>(
    "/logistics/kitchen/times",
    "GET",
    undefined,
    { quotationId },
  );
  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => (map[r.service_name] = r.start_time));
  return map;
};

export const ponerHorario = (
  quotationId: string,
  serviceName: string,
  startTime: string,
) =>
  apiRequest("/logistics/kitchen/times", "POST", {
    quotation_id: quotationId,
    service_name: serviceName,
    start_time: startTime,
  });

export const getMarcas = async (quotationId: string): Promise<Set<string>> => {
  const r = await apiRequest<{ marcas: { clave: string }[] }>(
    `/movil/cocina/${quotationId}/marcas`,
    "GET",
  );
  return new Set((r.marcas ?? []).map((m) => m.clave));
};

export const marcar = (quotationId: string, clave: string, marcado: boolean) =>
  apiRequest(`/movil/cocina/${quotationId}/marcas`, "POST", {
    clave,
    marcado,
  });
