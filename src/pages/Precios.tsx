import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clp, sinAcentos } from "../lib/formato";
import { getCatalogo } from "../services/datos";

// Pantalla 14 del handoff: buscador sobre el catálogo, solo lectura.
export default function Precios() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const catalogoQuery = useQuery({
    queryKey: ["catalogo"],
    queryFn: getCatalogo,
    staleTime: 5 * 60 * 1000,
  });

  const filas = useMemo(() => {
    const { variables = [], fijos = [] } = catalogoQuery.data ?? {};
    const todas = [
      ...variables.map((s) => ({
        id: `v${s.id}`,
        nombre: s.name,
        categoria: s.category,
        precio: s.price ?? 0,
        porPersona: true,
      })),
      ...fijos.map((s) => ({
        id: `f${s.id}`,
        nombre: s.name,
        categoria: "Servicio fijo",
        precio: s.price ?? s.price_per_person ?? 0,
        porPersona: !!s.price_per_person && !s.price,
      })),
    ];
    const needle = sinAcentos(q.trim());
    return needle
      ? todas.filter((f) =>
          sinAcentos(`${f.nombre} ${f.categoria}`).includes(needle),
        )
      : todas;
  }, [catalogoQuery.data, q]);

  return (
    <div className="px-4 pt-3 pb-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1 mb-1"
      >
        <ChevronLeft size={18} /> Volver
      </button>
      <h2 className="text-xl font-extrabold text-gray-900 mb-3">
        Consulta de precios
      </h2>
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar servicio…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {catalogoQuery.isPending && (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      )}

      <div className="divide-y divide-gray-100 bg-white border border-gray-100 rounded-[14px] overflow-hidden">
        {filas.map((f) => (
          <div key={f.id} className="flex justify-between items-center px-4 py-3">
            <div className="min-w-0 pr-3">
              <p className="text-[14px] font-semibold text-gray-900 truncate">
                {f.nombre}
              </p>
              <p className="text-xs text-gray-400">{f.categoria}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px] font-bold text-gray-900">
                {clp(f.precio)}
              </p>
              <p className="text-[11px] text-gray-400">
                {f.porPersona ? "por persona" : "precio fijo"}
              </p>
            </div>
          </div>
        ))}
        {!catalogoQuery.isPending && filas.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Sin resultados para “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}
