import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Share } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { MenuOrden, hojaCotizacion } from "../lib/hojaCotizacion";
import { getCotizacion } from "../services/datos";

// Bloque D del handoff, versión final (pedido de Felipe): la MISMA
// hoja del laptop — el documento que recibe el cliente — en pantalla
// y en el PDF. La plantilla vive portada línea a línea en
// lib/hojaCotizacion.ts.
export default function Detalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const q = useQuery({
    queryKey: ["cotizacion", id],
    queryFn: () => getCotizacion(id!),
    enabled: !!id,
  });
  const menuQuery = useQuery({
    queryKey: ["menu-orden"],
    queryFn: async () => {
      try {
        return await apiRequest<MenuOrden>("/sections/menu-order", "GET");
      } catch {
        return { categories: [], sections: [], links: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const c = q.data;

  if (q.isPending || menuQuery.isPending) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-[14px]"></div>
        <div className="h-64 bg-gray-200 rounded-[14px]"></div>
      </div>
    );
  }
  if (!c) {
    return (
      <p className="text-center text-sm text-gray-400 pt-16">
        No se encontró la cotización.
      </p>
    );
  }

  const { css, body } = hojaCotizacion(
    c,
    perfil?.companies ?? null,
    menuQuery.data ?? null,
  );

  const compartirPdf = () => {
    const html = `<!DOCTYPE html>
      <html lang="es"><head><meta charset="utf-8">
      <title>Cotización ${c.quotation_number} - ${perfil?.companies?.name ?? ""}</title>
      <style>body{margin:0;} ${css}</style>
      </head><body>${body}</body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      setTimeout(() => ventana.print(), 500);
      return;
    }
    // PWA instalada (iOS puede bloquear ventanas): iframe invisible.
    const marco = document.createElement("iframe");
    marco.style.position = "fixed";
    marco.style.right = "0";
    marco.style.bottom = "0";
    marco.style.width = "0";
    marco.style.height = "0";
    marco.style.border = "0";
    document.body.appendChild(marco);
    marco.srcdoc = html;
    marco.onload = () => {
      setTimeout(() => {
        marco.contentWindow?.print();
        setTimeout(() => marco.remove(), 2000);
      }, 300);
    };
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-3 flex items-center justify-between no-imprimir">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 py-1"
        >
          <ChevronLeft size={18} /> Volver
        </button>
        <button
          type="button"
          onClick={compartirPdf}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-[13px] font-bold px-3.5 py-2 rounded-xl"
        >
          <Share size={14} /> PDF
        </button>
      </div>

      {/* La hoja OFICIAL, la misma del laptop, adaptada al ancho del
          teléfono con un leve zoom-out para que se lea completa. */}
      <style>{`
        ${css}
        .qv-envoltorio { overflow-x: auto; }
        .qv-envoltorio .qv-hoja {
          min-width: 640px;
          transform-origin: top left;
          box-shadow: 0 1px 8px rgba(16,24,40,.12);
          margin: 12px;
          border-radius: 8px;
        }
      `}</style>
      <div className="qv-envoltorio">
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </div>
      <p className="text-center text-[11px] text-gray-400 px-6 no-imprimir">
        El botón PDF abre el diálogo del teléfono: Guardar como PDF,
        WhatsApp, AirDrop o imprimir. Es el mismo documento del
        computador.
      </p>
    </div>
  );
}
