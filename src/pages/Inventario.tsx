import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, X } from "lucide-react";
import {
  CATEGORIAS_MOBILIARIO,
  ItemMobiliario,
  actualizarFotoMobiliario,
  crearMobiliario,
  getMobiliario,
  subirFotoMobiliario,
} from "../services/datos";

// Pantalla 11 del handoff: chips Todos/Mobiliario/Insumos, grid de 2
// columnas con foto o placeholder, FAB de alta simple y sheet de ítem
// con tomar/reemplazar foto. Los insumos ganan foto con la migración
// 43 (por ahora, solo listado).
export default function Inventario() {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState<ItemMobiliario | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("otro");
  const [stock, setStock] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoAlta = useRef<HTMLInputElement>(null);
  const inputFotoItem = useRef<HTMLInputElement>(null);
  const [fotoAlta, setFotoAlta] = useState<File | null>(null);

  const mobiliarioQuery = useQuery({
    queryKey: ["mobiliario"],
    queryFn: getMobiliario,
    staleTime: 60 * 1000,
  });
  // Solo MOBILIARIO (validado contra la web 29-07: las fotos viven en
  // mobiliario; insumos es una lista técnica sin fotos — su foto llega
  // recién con la migración 43, si algún día se necesita).
  const tarjetas = useMemo(
    () =>
      (mobiliarioQuery.data ?? []).map((f) => ({
        id: `m${f.id}`,
        item: f,
        nombre: f.name,
        detalle: `${CATEGORIAS_MOBILIARIO.find(([v]) => v === f.category)?.[1] ?? f.category} · ${f.stock} uds`,
        foto: f.photo_url,
      })),
    [mobiliarioQuery.data],
  );

  const guardarAlta = async () => {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      const creado = await crearMobiliario({
        name: nombre.trim(),
        category: categoria,
        stock: Number(stock || 0),
      });
      if (fotoAlta && creado?.id) {
        const url = await subirFotoMobiliario(creado.id, fotoAlta);
        await actualizarFotoMobiliario(creado.id, url);
      }
      queryClient.invalidateQueries({ queryKey: ["mobiliario"] });
      setAltaAbierta(false);
      setNombre("");
      setStock("");
      setFotoAlta(null);
    } finally {
      setGuardando(false);
    }
  };

  const reemplazarFoto = async (archivo: File) => {
    if (!abierto || subiendoFoto) return;
    setSubiendoFoto(true);
    try {
      const url = await subirFotoMobiliario(abierto.id, archivo);
      await actualizarFotoMobiliario(abierto.id, url);
      setAbierto({ ...abierto, photo_url: url });
      queryClient.invalidateQueries({ queryKey: ["mobiliario"] });
    } finally {
      setSubiendoFoto(false);
    }
  };

  return (
    <div className="px-4 pt-3 pb-6">
      {mobiliarioQuery.isPending && (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-[14px]"></div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {tarjetas.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.item}
            onClick={() => t.item && setAbierto(t.item)}
            className="bg-white border border-gray-100 rounded-[14px] p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,.05)]"
          >
            {t.foto ? (
              <img
                src={t.foto}
                alt={t.nombre}
                className="w-full h-24 object-cover rounded-[10px] mb-2"
              />
            ) : (
              <div className="w-full h-24 border-2 border-dashed border-gray-200 rounded-[10px] mb-2 flex flex-col items-center justify-center text-gray-300">
                <Camera size={20} />
                <span className="text-[10px] font-semibold mt-1">Sin foto</span>
              </div>
            )}
            <p className="text-[13px] font-bold text-gray-900 truncate">
              {t.nombre}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{t.detalle}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAltaAbierta(true)}
        className="fixed bottom-[88px] right-4 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center z-30"
        aria-label="Nuevo ítem"
      >
        <Plus size={26} />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(17,24,39,.45)] flex items-end"
          onClick={() => setAbierto(null)}
        >
          <div
            className="bg-white w-full rounded-t-[22px] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {abierto.name}
              </h3>
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="text-gray-300"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            {abierto.photo_url ? (
              <img
                src={abierto.photo_url}
                alt={abierto.name}
                className="w-full h-56 object-cover rounded-[14px] mb-3"
              />
            ) : (
              <div className="w-full h-40 border-2 border-dashed border-gray-200 rounded-[14px] mb-3 flex items-center justify-center text-gray-300">
                <Camera size={28} />
              </div>
            )}
            <input
              ref={inputFotoItem}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) reemplazarFoto(f);
              }}
            />
            <button
              type="button"
              disabled={subiendoFoto}
              onClick={() => inputFotoItem.current?.click()}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-[14px] disabled:opacity-45 flex items-center justify-center gap-2"
            >
              <Camera size={17} />
              {subiendoFoto
                ? "Subiendo…"
                : abierto.photo_url
                  ? "Reemplazar foto"
                  : "Tomar foto"}
            </button>
          </div>
        </div>
      )}

      {altaAbierta && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(17,24,39,.45)] flex items-end"
          onClick={() => setAltaAbierta(false)}
        >
          <div
            className="bg-white w-full rounded-t-[22px] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Nuevo ítem de mobiliario
            </h3>
            <div className="space-y-2">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre (ej: Copa de vino)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px]"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] bg-white"
              >
                {CATEGORIAS_MOBILIARIO.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
              <input
                inputMode="numeric"
                value={stock}
                onChange={(e) =>
                  setStock(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="Stock (unidades)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px]"
              />
              <input
                ref={inputFotoAlta}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setFotoAlta(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputFotoAlta.current?.click()}
                className="w-full py-3 border border-gray-200 rounded-xl text-[14px] font-semibold text-gray-600 flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                {fotoAlta ? fotoAlta.name : "Foto (opcional)"}
              </button>
            </div>
            <button
              type="button"
              disabled={!nombre.trim() || guardando}
              onClick={guardarAlta}
              className="w-full mt-4 py-3 bg-blue-600 text-white font-bold rounded-[14px] disabled:opacity-45"
            >
              {guardando ? "Guardando…" : "Guardar ítem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
