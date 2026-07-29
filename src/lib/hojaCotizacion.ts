// HOJA DE COTIZACIÓN — PORTADA LÍNEA A LÍNEA del QuotationViewer del
// laptop (29-07, pedido de Felipe: el PDF del teléfono debe ser EL
// MISMO documento que recibe el cliente). Si el laptop cambia su
// plantilla, copiar el bloque de nuevo. Función pura: entra la
// cotización + empresa + orden de la carta, sale {css, body}.
const clp = (n: number) => "$" + Math.round(n || 0).toLocaleString("es-CL");

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export interface CategorySection {
  id: number;
  sort_order: number;
}
export interface MenuLink {
  variable_service_id: number | string;
  section_id: number;
  category_id: number;
}
export interface MenuOrden {
  categories: { id: number; name: string }[];
  sections: CategorySection[];
  links: MenuLink[];
}

export interface EmpresaHoja {
  name?: string;
  logo_url?: string | null;
  colors?: { primary?: string; secondary?: string } | null;
}

export interface CotizacionHoja {
  quotation_number: number;
  people_count: number | null;
  children_count: number | null;
  tip_percentage: number | null;
  total_amount: number;
  subtotal_amount: number;
  event_date: string | null;
  event_end_date: string | null;
  event_type: string | null;
  contact_name: string | null;
  observations: string | null;
  created_at: string;
  clients: { name: string } | null;
  items: {
    variable_services?: unknown[];
    fixed_services?: unknown[];
  } | null;
}

export function hojaCotizacion(
  quotation: CotizacionHoja,
  company: EmpresaHoja | null,
  menu: MenuOrden | null,
): { css: string; body: string } {
  // ---------- Datos base ----------
  const kids = Number(quotation.children_count || 0);
  const adults = Math.max(0, Number(quotation.people_count || 0) - kids);

  type VarGroup = {
    category?: string;
    day?: number;
    audience?: string;
    people?: number;
    items?: {
      codigo?: string;
      nombre?: string;
      precio?: number;
      quantity?: number;
    }[];
  };
  const varGroups: VarGroup[] = (quotation.items?.variable_services ||
    []) as VarGroup[];
  const fixedList = (quotation.items?.fixed_services || []) as {
    nombre?: string;
    precio?: number;
    quantity?: number;
    day?: number;
  }[];

  const audienceOf = (g: VarGroup) =>
    g.audience === "ninos" ? "ninos" : "adultos";
  const audienceTotal = (g: VarGroup) =>
    audienceOf(g) === "ninos" ? kids : adults;
  const groupPeople = (g: VarGroup) =>
    typeof g.people === "number"
      ? g.people
      : audienceTotal(g) || Number(quotation.people_count || 0);
  const groupPerPerson = (g: VarGroup) =>
    (g.items || []).reduce(
      (s, it) => s + (it.precio || 0) * (it.quantity || 1),
      0,
    );
  const isFull = (g: VarGroup) => groupPeople(g) === audienceTotal(g);

  // Orden de presentación (Felipe, 23-07): manda la MESA DE TRABAJO.
  // Solo se agrupa por día en eventos multi-día; dentro de cada día se
  // respeta el orden en que se armaron (y arrastraron) las categorías
  // en el cotizador. Se eliminaron los criterios antiguos (posición de
  // la categoría en el catálogo y adultos-primero): re-ordenaban el PDF
  // a espaldas del usuario. sort() es estable → el empate por día
  // conserva el orden original del arreglo. Aplica al programa y a la
  // tabla de valores por igual.
  const sortedGroups = [...varGroups].sort(
    (a, b) => (a.day || 1) - (b.day || 1),
  );

  const variableTotal = varGroups.reduce(
    (s, g) => s + groupPerPerson(g) * groupPeople(g),
    0,
  );
  const perAdulto = varGroups
    .filter((g) => audienceOf(g) === "adultos" && isFull(g))
    .reduce((s, g) => s + groupPerPerson(g), 0);
  const perNino = varGroups
    .filter((g) => audienceOf(g) === "ninos" && isFull(g))
    .reduce((s, g) => s + groupPerPerson(g), 0);
  const partials = sortedGroups.filter((g) => !isFull(g));

  const fixedTotal = fixedList.reduce(
    (s, f) => s + (f.precio || 0) * (f.quantity || 1),
    0,
  );

  // Propina: se recalcula (no se guarda el monto)
  const tipPct = quotation.tip_percentage;
  const tipAmount =
    tipPct != null && tipPct > 0
      ? Math.round(variableTotal * (tipPct / 100))
      : 0;
  const totalConIva = Math.round(
    Number(quotation.total_amount || 0) - tipAmount,
  );
  const neto = Math.round(totalConIva / 1.19);
  const iva = totalConIva - neto;
  const subtotal = Math.round(Number(quotation.subtotal_amount || 0));
  const discount = Math.max(0, subtotal - totalConIva);

  // ---------- Fechas ----------
  const startMs = new Date(String(quotation.event_date)).getTime();
  const endMs = quotation.event_end_date
    ? new Date(String(quotation.event_end_date)).getTime()
    : NaN;
  const daysCount =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.min(60, Math.round((endMs - startMs) / 86400000) + 1)
      : 1;
  const multiDay = daysCount > 1;

  const fmtLarga = (ms: number) =>
    new Date(ms).toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  const eventDateLabel = (() => {
    if (!Number.isFinite(startMs)) return "—";
    const y = new Date(startMs).toLocaleDateString("es-CL", {
      year: "numeric",
      timeZone: "UTC",
    });
    if (!multiDay) return `${fmtLarga(startMs)} ${y}`;
    const d1 = new Date(startMs).toLocaleDateString("es-CL", {
      day: "numeric",
      timeZone: "UTC",
    });
    const d2 = new Date(endMs).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
    return `${d1} al ${d2} ${y} <small>(${daysCount} días)</small>`;
  })();
  const dayHeader = (n: number) =>
    `Día ${n} — ${fmtLarga(startMs + (n - 1) * 86400000)}`;
  const emittedLabel = new Date(quotation.created_at).toLocaleDateString(
    "es-CL",
    { day: "numeric", month: "long", year: "numeric" },
  );

  // ---------- Colores de marca ----------
  // Primario: acentos de identidad (línea del encabezado, "COTIZACIÓN",
  // títulos de sección, etiqueta ADULTOS, panel TOTAL A PAGAR, logo sin
  // imagen). Secundario: fondos suaves (franjas de día, fila de subtotal,
  // caja de observaciones). Si la empresa no configuró colores, se usa el
  // azul y los grises del mockup aprobado. El texto sobre el primario se
  // elige blanco o negro automáticamente según la luminosidad del color.
  const hexOk = (c?: string) =>
    c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null;
  const brandP = hexOk(company?.colors?.primary) || "#1e3a8a";
  const brandS = hexOk(company?.colors?.secondary);
  const onBrandP = (() => {
    const n = parseInt(brandP.slice(1), 16);
    const lum =
      (0.299 * ((n >> 16) & 255) +
        0.587 * ((n >> 8) & 255) +
        0.114 * (n & 255)) /
      255;
    return lum > 0.6 ? "#111827" : "#fff";
  })();

  // ---------- Plantilla (mockup aprobado) ----------
  const css = `
    .qv-hoja { background:#fff; padding:48px 56px; font-family:-apple-system,'Segoe UI',Roboto,sans-serif; color:#111827; }
    .qv-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid ${brandP}; padding-bottom:18px; }
    .qv-marca { display:flex; gap:14px; align-items:center; }
    .qv-logo { width:88px; height:88px; border-radius:50%; background:${brandP}; color:${onBrandP}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:32px; overflow:hidden; }
    .qv-logo img { width:100%; height:100%; object-fit:cover; }
    .qv-marca h1 { font-size:19px; letter-spacing:.2px; margin:0; }
    .qv-folio { text-align:right; }
    .qv-folio .tipo { font-size:11px; font-weight:800; letter-spacing:2px; color:${brandP}; text-transform:uppercase; }
    .qv-folio .num { font-size:26px; font-weight:800; }
    .qv-folio .fecha { font-size:11px; color:#6b7280; margin-top:2px; }
    .qv-datos { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px 24px; padding:18px 0; border-bottom:1px solid #e5e7eb; }
    .qv-dato .k { font-size:9.5px; font-weight:800; letter-spacing:1px; color:#9ca3af; text-transform:uppercase; }
    .qv-dato .v { font-size:13px; font-weight:600; margin-top:1px; }
    .qv-dato .v small { font-weight:400; color:#6b7280; }
    .qv-hoja h2 { font-size:11px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:${brandP}; margin:26px 0 10px; }
    .qv-dia { margin-bottom:12px; }
    .qv-dia h3 { font-size:12px; font-weight:800; color:#374151; background:${brandS || "#f3f4f6"}; border-radius:6px; padding:5px 10px; margin:0 0 4px; }
    .qv-prog { width:100%; border-collapse:collapse; }
    .qv-prog td { font-size:12.5px; padding:5px 10px; border-bottom:1px solid #f3f4f6; color:#1f2937; }
    .qv-prog tr:last-child td { border-bottom:none; }
    .qv-prog .aud { text-align:right; color:#6b7280; font-size:11.5px; white-space:nowrap; vertical-align:top; padding-top:7px; }
    .qv-prog .inc { font-size:11px; color:#6b7280; font-weight:400; margin-top:2px; line-height:1.5; }
    .qv-tagA { color:${brandP}; font-weight:800; font-size:9.5px; letter-spacing:.5px; }
    .qv-tagN { color:#b45309; font-weight:800; font-size:9.5px; letter-spacing:.5px; }
    .qv-val { width:100%; border-collapse:collapse; }
    .qv-val td { font-size:12.5px; padding:6px 10px; border-bottom:1px solid #f3f4f6; color:#1f2937; }
    .qv-val .der { text-align:right; white-space:nowrap; font-weight:600; color:#111827; }
    .qv-val .calc { color:#6b7280; font-weight:400; }
    .qv-val td:first-child { width:100%; }
    .qv-val .per { text-align:right; white-space:nowrap; }
    .qv-val .unit { text-align:right; white-space:nowrap; color:#6b7280; font-weight:400; }
    .qv-val tr.sub td { font-weight:800; color:#111827; background:${brandS || "#f9fafb"}; }
    .qv-resumen { margin-top:22px; margin-left:auto; width:320px; }
    .qv-resumen .linea { display:flex; justify-content:space-between; font-size:12.5px; color:#4b5563; padding:4px 12px; }
    .qv-resumen .linea b { color:#111827; }
    .qv-resumen .iva-box { border-top:1px solid #e5e7eb; margin-top:4px; padding-top:4px; }
    .qv-resumen .totcon { display:flex; justify-content:space-between; background:#fef3c7; font-size:13px; font-weight:800; padding:7px 12px; border-radius:6px; margin-top:6px; }
    .qv-resumen .prop { display:flex; justify-content:space-between; font-size:12px; color:#6b7280; padding:5px 12px; border-bottom:1px dashed #e5e7eb; }
    .qv-resumen .final { display:flex; justify-content:space-between; background:${brandP}; color:${onBrandP}; font-size:14.5px; font-weight:800; padding:9px 12px; border-radius:6px; margin-top:6px; }
    .qv-obs { margin-top:24px; background:${brandS || "#f9fafb"}; border-radius:8px; padding:12px 14px; font-size:12px; color:#4b5563; }
    .qv-obs b { display:block; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin-bottom:4px; }
    .qv-pie { margin-top:28px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:10.5px; color:#9ca3af; display:flex; justify-content:space-between; }
    /* Los colores del documento se respetan al imprimir/PDF: sin esto,
       el navegador borra los fondos (modo ahorro de tinta) y la papeleta
       sale lavada. */
    .qv-hoja, .qv-hoja * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      @page { margin: 12mm; }
      body { background: #fff !important; }
      .qv-hoja { padding: 0; }
    }
  `;

  // Nombres de lo que incluye un servicio, ordenados como la carta.
  const includesOf = (g: VarGroup): string => {
    const items = (g.items || []).filter((it) => it.nombre);
    if (items.length === 0) return "";
    if (!menu) return items.map((it) => it.nombre).join(" · ");
    const cat = menu.categories.find((c) => c.name === g.category);
    const secSort = new Map(menu.sections.map((s) => [s.id, s.sort_order]));
    const linkSec = new Map(
      menu.links
        .filter((l) => !cat || l.category_id === cat.id)
        .map((l) => [String(l.variable_service_id), l.section_id]),
    );
    return items
      .map((it, i) => ({
        nombre: it.nombre as string,
        sort:
          (it.codigo && linkSec.get(String(it.codigo)) != null
            ? (secSort.get(linkSec.get(String(it.codigo)) as number) ?? 9998)
            : 9999) *
            10000 +
          i,
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.nombre)
      .join(" · ");
  };

  const audTag = (g: VarGroup) =>
    audienceOf(g) === "ninos"
      ? `<span class="qv-tagN">NIÑOS</span>`
      : `<span class="qv-tagA">ADULTOS</span>`;

  const progRow = (g: VarGroup) => {
    const inc = includesOf(g);
    return `<tr><td><b>${esc(g.category || "Servicio")}</b>${
      inc ? `<div class="inc"><b>Incluye:</b> ${esc(inc)}</div>` : ""
    }</td><td class="aud">${audTag(g)} · ${groupPeople(g).toLocaleString("es-CL")} personas</td></tr>`;
  };

  const programa = multiDay
    ? Array.from({ length: daysCount }, (_, i) => i + 1)
        .map((n) => {
          const del = sortedGroups.filter(
            (g) => Math.min(g.day || 1, daysCount) === n,
          );
          if (del.length === 0) return "";
          return `<div class="qv-dia"><h3>${esc(dayHeader(n))}</h3><table class="qv-prog">${del
            .map(progRow)
            .join("")}</table></div>`;
        })
        .join("")
    : `<table class="qv-prog">${sortedGroups.map(progRow).join("")}</table>`;

  // Tabla de valores en columnas alineadas: Concepto | Personas | Valor |
  // Monto. El "cuándo" (día de cada servicio) vive en el programa del
  // evento, no aquí (decisión de Felipe, 20-07-2026).
  const valoresRows = [
    adults > 0 && perAdulto > 0
      ? `<tr><td><span class="qv-tagA">ADULTOS</span> &nbsp;Valor por persona</td><td class="per">${adults.toLocaleString("es-CL")} personas</td><td class="unit">${clp(perAdulto)}</td><td class="der">${clp(perAdulto * adults)}</td></tr>`
      : "",
    kids > 0 && perNino > 0
      ? `<tr><td><span class="qv-tagN">NIÑOS</span> &nbsp;Valor por persona</td><td class="per">${kids.toLocaleString("es-CL")} personas</td><td class="unit">${clp(perNino)}</td><td class="der">${clp(perNino * kids)}</td></tr>`
      : "",
    ...partials.map(
      (g) =>
        `<tr><td>${esc(g.category || "Servicio")}</td><td class="per">${groupPeople(g).toLocaleString("es-CL")} personas</td><td class="unit">${clp(groupPerPerson(g))}</td><td class="der">${clp(groupPerPerson(g) * groupPeople(g))}</td></tr>`,
    ),
    `<tr class="sub"><td colspan="3">Subtotal alimentación</td><td class="der">${clp(variableTotal)}</td></tr>`,
  ].join("");

  const fijosRows =
    fixedList.length > 0
      ? [
          ...fixedList.map((f) => {
            const qty = f.quantity || 1;
            const dayTag = multiDay
              ? ` <span class="calc">· ${
                  !f.day || f.day === 0
                    ? "todo el evento"
                    : `Día ${Math.min(f.day, daysCount)}`
                }</span>`
              : "";
            return `<tr><td>${esc(f.nombre || "")}${qty > 1 ? ` <span class="calc">×${qty}</span>` : ""}${dayTag}</td><td class="der">${clp((f.precio || 0) * qty)}</td></tr>`;
          }),
          `<tr class="sub"><td>Subtotal servicios fijos</td><td class="der">${clp(fixedTotal)}</td></tr>`,
        ].join("")
      : "";

  const logoHtml = company?.logo_url
    ? `<img src="${esc(company.logo_url)}" alt="logo">`
    : esc(
        (company?.name || "E")
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      );

  const body = `
    <div class="qv-hoja">
      <div class="qv-head">
        <div class="qv-marca">
          <div class="qv-logo">${logoHtml}</div>
          <div><h1>${esc(company?.name || "Empresa")}</h1></div>
        </div>
        <div class="qv-folio">
          <div class="tipo">Cotización</div>
          <div class="num">N° ${quotation.quotation_number}</div>
          <div class="fecha">Emitida el ${esc(emittedLabel)}</div>
        </div>
      </div>

      <div class="qv-datos">
        <div class="qv-dato"><div class="k">Cliente</div><div class="v">${esc(quotation.clients?.name || "—")}</div></div>
        ${
          quotation.contact_name
            ? `<div class="qv-dato"><div class="k">Persona de contacto</div><div class="v">${esc(quotation.contact_name)}</div></div>`
            : ""
        }
        <div class="qv-dato"><div class="k">Tipo de evento</div><div class="v">${esc(String(quotation.event_type || "—"))}</div></div>
        <div class="qv-dato"><div class="k">Fecha del evento</div><div class="v">${eventDateLabel}</div></div>
        <div class="qv-dato"><div class="k">Asistentes</div><div class="v">${(adults + kids).toLocaleString("es-CL")}${kids > 0 ? ` <small>· ${adults} adultos + ${kids} niños</small>` : ""}</div></div>
        <div class="qv-dato"><div class="k">Validez</div><div class="v">15 días</div></div>
      </div>

      ${varGroups.length > 0 ? `<h2>Programa del evento</h2>${programa}` : ""}

      ${varGroups.length > 0 ? `<h2>Valores · servicios de alimentación</h2><table class="qv-val">${valoresRows}</table>` : ""}

      ${fijosRows ? `<h2>Servicios fijos del evento</h2><table class="qv-val">${fijosRows}</table>` : ""}

      <div class="qv-resumen">
        ${
          discount > 0
            ? `<div class="linea"><span>Subtotal</span><b>${clp(subtotal)}</b></div>
               <div class="linea"><span>Descuento</span><b>−${clp(discount)}</b></div>`
            : ""
        }
        <div class="linea iva-box"><span>Neto</span><b>${clp(neto)}</b></div>
        <div class="linea"><span>IVA (19%)</span><b>${clp(iva)}</b></div>
        ${
          tipAmount > 0
            ? `<div class="totcon"><span>Total con IVA</span><span>${clp(totalConIva)}</span></div>
               <div class="prop"><span>Propina sugerida (${tipPct}% alimentación)</span><span>${clp(tipAmount)}</span></div>
               <div class="final"><span>TOTAL</span><span>${clp(totalConIva + tipAmount)}</span></div>`
            : `<div class="final"><span>TOTAL</span><span>${clp(totalConIva)}</span></div>`
        }
      </div>

      ${
        quotation.observations
          ? `<div class="qv-obs"><b>Observaciones</b>${esc(quotation.observations)}</div>`
          : ""
      }

      <div class="qv-pie">
        <span>${esc(company?.name || "")}</span>
        <span>Cotización N° ${quotation.quotation_number} · válida por 15 días</span>
      </div>
    </div>
  `;

  return { css, body };
}
