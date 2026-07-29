import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buildConsolidationContext,
  consolidateEvent,
  newAccumulator,
} from "../lib/eventConsolidation";
import { fechaRelativa } from "../lib/formato";
import {
  getBaseCocina,
  getEventos,
  getEventosCompras,
  getHorarios,
  getMarcas,
  marcar,
  ponerHorario,
} from "../services/datos";

// Pantalla 12 del handoff: ficha de cocina móvil. La ficha es
// CALCULADA (receta × personas, mismo motor del laptop, portado tal
// cual); los horarios se editan con el endpoint existente (± 15 min);
// los checklists guardan sus marcas en la tabla nueva (migración 44).
const sumar15 = (hhmm: string, delta: number): string => {
  const [h, m] = (hhmm || "12:00").split(":").map(Number);
  let total = h * 60 + m + delta;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function Cocina() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const eventosQuery = useQuery({ queryKey: ["eventos"], queryFn: getEventos, staleTime: 60000 });
  const comprasQuery = useQuery({
    queryKey: ["eventos-compras"],
    queryFn: getEventosCompras,
    staleTime: 60000,
  });
  const baseQuery = useQuery({
    queryKey: ["base-cocina"],
    queryFn: getBaseCocina,
    staleTime: 5 * 60 * 1000,
  });
  const horariosQuery = useQuery({
    queryKey: ["horarios", id],
    queryFn: () => getHorarios(id!),
    enabled: !!id,
  });
  const marcasQuery = useQuery({
    queryKey: ["marcas", id],
    queryFn: () => getMarcas(id!),
    enabled: !!id,
  });

  const evento = (eventosQuery.data ?? []).find((e) => e.id === id);
  const eventoCompras = (comprasQuery.data ?? []).find((e) => e.id === id);

  const ficha = useMemo(() => {
    if (!eventoCompras || !baseQuery.data) return null;
    const { recipes, supplies, furniture, nameIds } = baseQuery.data;
    const ctx = buildConsolidationContext(
      recipes,
      supplies,
      furniture,
      nameIds,
      {},
    );
    const acc = newAccumulator();
    const r = consolidateEvent(
      eventoCompras.items,
      eventoCompras.people_count || 0,
      ctx,
      acc,
    );
    const insumos = [...r.supplyUse.entries()]
      .map(([sid, cant]) => {
        const s = supplies.find((x) => x.id === sid);
        return s ? { clave: `insumo-${sid}`, nombre: s.name, detalle: `${Math.ceil(cant * 100) / 100} ${s.unit_family}` } : null;
      })
      .filter(Boolean) as { clave: string; nombre: string; detalle: string }[];
    const mobiliario = [...r.furnPeak.entries()]
      .map(([fid, p]) => {
        const f = furniture.find((x) => x.id === fid);
        return f
          ? {
              clave: `mob-${fid}`,
              nombre: f.name,
              detalle: `${Math.ceil(p.total)} uds`,
            }
          : null;
      })
      .filter(Boolean) as { clave: string; nombre: string; detalle: string }[];
    // Horarios POR CATEGORÍA — calco exacto de FichaCocinaSection del
    // laptop: cada CAJA de la cotización es un slot; si la categoría se
    // repite, la clave lleva #2, #3… (misma clave = comparten los
    // horarios ya guardados) y el rótulo "(2º)". Audiencia visible solo
    // si el evento tiene niños.
    const cajas = (eventoCompras.items.variable_services ?? []) as {
      category?: string;
      people?: number;
      audience?: string;
      items?: { nombre: string }[];
    }[];
    const kids = Number(evento?.children_count || 0);
    const conteo = new Map<string, number>();
    cajas.forEach((c) =>
      conteo.set(c.category ?? "—", (conteo.get(c.category ?? "—") || 0) + 1),
    );
    const vistas = new Map<string, number>();
    const servicios = cajas.map((c) => {
      const cat = c.category ?? "—";
      const n = (vistas.get(cat) || 0) + 1;
      vistas.set(cat, n);
      const repetida = (conteo.get(cat) || 1) > 1;
      const audTag =
        kids > 0 && c.audience
          ? c.audience === "ninos"
            ? " · Niños"
            : " · Adultos"
          : "";
      return {
        key: n === 1 ? cat : `${cat}#${n}`,
        label: (repetida ? `${cat} (${n}º)` : cat) + audTag,
        people: c.people ?? eventoCompras.people_count ?? 0,
      };
    });
    return { insumos, mobiliario, servicios };
  }, [eventoCompras, baseQuery.data]);

  const marcarMut = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: boolean }) =>
      marcar(id!, clave, valor),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["marcas", id] }),
  });

  const horarioMut = useMutation({
    mutationFn: ({ servicio, hora }: { servicio: string; hora: string }) =>
      ponerHorario(id!, servicio, hora),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["horarios", id] }),
  });

  const marcas = marcasQuery.data ?? new Set<string>();
  const toggle = (clave: string) =>
    marcarMut.mutate({ clave, valor: !marcas.has(clave) });

  const cargando =
    comprasQuery.isPending || baseQuery.isPending || eventosQuery.isPending;

  const Checklist = ({
    titulo,
    items,
  }: {
    readonly titulo: string;
    readonly items: { clave: string; nombre: string; detalle: string }[];
  }) => {
    const listos = items.filter((i) => marcas.has(i.clave)).length;
    if (items.length === 0) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            {titulo}
          </p>
          <span className="text-[12px] font-bold text-green-600">
            {listos} de {items.length} ✓
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((i) => {
            const listo = marcas.has(i.clave);
            return (
              <button
                key={i.clave}
                type="button"
                onClick={() => toggle(i.clave)}
                className="w-full flex items-center gap-3 py-2.5 text-left"
              >
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    listo
                      ? "bg-[#16a34a] border-[#16a34a]"
                      : "border-gray-300"
                  }`}
                >
                  {listo && <Check size={14} className="text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[14px] font-medium truncate ${
                      listo ? "text-gray-400 line-through" : "text-gray-800"
                    }`}
                  >
                    {i.nombre}
                  </span>
                  <span className="block text-[12px] text-gray-400">
                    {i.detalle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-3 pb-8 space-y-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>
      <h2 className="text-xl font-extrabold text-gray-900">
        Ficha de cocina
        {evento && (
          <span className="block text-sm font-semibold text-gray-400">
            {evento.clients?.name} · {fechaRelativa(evento.event_date)}
          </span>
        )}
      </h2>

      {evento?.observations && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-[14px] p-3 text-[13px] text-[#854d0e]">
          {evento.observations}
        </div>
      )}

      {cargando && (
        <div className="space-y-3 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-[14px]"></div>
          <div className="h-40 bg-gray-200 rounded-[14px]"></div>
        </div>
      )}

      {!cargando && !ficha && (
        <p className="text-center text-sm text-gray-400 pt-10">
          Este evento no tiene ficha de cocina calculada.
        </p>
      )}

      {ficha && ficha.servicios.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Servicios y horarios
          </p>
          <div className="space-y-3">
            {ficha.servicios.map((sv) => {
              const hora = horariosQuery.data?.[sv.key] ?? "12:00";
              return (
                <div key={sv.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        horarioMut.mutate({
                          servicio: sv.key,
                          hora: sumar15(hora, -15),
                        })
                      }
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500"
                      aria-label="15 minutos antes"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-[14px] font-bold text-blue-700 tabular-nums w-12 text-center">
                      {hora}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        horarioMut.mutate({
                          servicio: sv.key,
                          hora: sumar15(hora, 15),
                        })
                      }
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500"
                      aria-label="15 minutos después"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">
                      {sv.label}
                    </p>
                    <p className="text-[11.5px] text-gray-400">
                      {sv.people} personas
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ficha && (
        <>
          <Checklist titulo="Retiro de bodega" items={ficha.insumos} />
          <Checklist titulo="Mobiliario a montar" items={ficha.mobiliario} />
        </>
      )}
    </div>
  );
}
