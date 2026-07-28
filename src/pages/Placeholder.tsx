// Marcador de posición de las fases siguientes: cada tab nace con su
// promesa a la vista, para que el cascarón se sienta vivo desde hoy.
export default function Placeholder({
  titulo,
  fase,
}: {
  readonly titulo: string;
  readonly fase: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 pt-24">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <p className="font-bold text-gray-900">{titulo}</p>
      <p className="text-sm text-gray-500 mt-1">
        Llega en la {fase} del plan de desarrollo.
      </p>
    </div>
  );
}
