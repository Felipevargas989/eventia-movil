// Formatos del handoff: CLP es-CL sin decimales; fechas relativas
// "Hoy" / "Mañana" / "Mié 31 jul". Las fechas de evento viajan como
// ISO UTC — se comparan por su parte yyyy-mm-dd (sin zona), igual que
// el sistema del computador.
export const clp = (n: number) =>
  "$" + new Intl.NumberFormat("es-CL").format(Math.round(n || 0));

export const soloFecha = (iso: string | null | undefined): string =>
  (iso || "").split("T")[0];

export const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export const fechaRelativa = (iso: string | null | undefined): string => {
  const f = soloFecha(iso);
  if (!f) return "—";
  const hoy = hoyISO();
  if (f === hoy) return "Hoy";
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const mananaISO = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`;
  if (f === mananaISO) return "Mañana";
  const [y, m, d] = f.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return `${DIAS[fecha.getDay()]} ${d} ${MESES[m - 1]}`;
};

export const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
