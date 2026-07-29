// Chips de estado de cotización — colores del handoff (tokens del
// sistema grande).
const ESTILOS: Record<string, string> = {
  aceptada: "bg-green-100 text-green-800",
  enviada: "bg-blue-100 text-blue-800",
  en_negociacion: "bg-yellow-100 text-yellow-800",
  solicitada: "bg-gray-100 text-gray-700",
  realizada: "bg-[#f3e8ff] text-[#6b21a8]",
  rechazada: "bg-red-100 text-red-800",
};
const NOMBRES: Record<string, string> = {
  aceptada: "Aceptada",
  enviada: "Enviada",
  en_negociacion: "En negociación",
  solicitada: "Solicitada",
  realizada: "Realizada",
  rechazada: "Rechazada",
};

export default function ChipEstado({ estado }: { readonly estado: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${ESTILOS[estado] ?? "bg-gray-100 text-gray-700"}`}
    >
      {NOMBRES[estado] ?? estado}
    </span>
  );
}
