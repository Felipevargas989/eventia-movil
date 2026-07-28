# Eventia Móvil

La app de terreno de Eventia (PWA instalable). Repo independiente del
sistema principal (`quotations_system`): consume el MISMO backend
NestJS con la misma sesión Supabase y los mismos roles.

- Plan de desarrollo: `00_DOCUMENTACION/09_PLAN_EVENTIA_MOVIL.md`
  (OneDrive del proyecto).
- Diseño de referencia: handoff `design_handoff_eventia_movil`
  (README + prototipo + 12 capturas, alta fidelidad).
- Regla de oro: al backend SOLO SE AGREGA; el desarrollo apunta al
  LABORATORIO (base espejo) hasta el visto bueno de Felipe.
- Build: `npm run build` con las 3 variables VITE_ (API, Supabase URL
  y anon key — del laboratorio o de producción según destino).
