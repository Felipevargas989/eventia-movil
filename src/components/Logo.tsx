// El logo Eventia de la landing (mismo SVG del sistema grande).
export default function Logo({ size = 24 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-label="Eventia"
    >
      <path d="M8 11 H41 L32 21 H8 Z" fill="#1597E5" />
      <path d="M8 25 H35 L26 35 H8 Z" fill="#1597E5" />
      <path
        d="M11 41 L22 53 L49 24"
        stroke="#0B1F33"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
