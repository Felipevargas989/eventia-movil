import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import AppShell from "./shell/AppShell";

const queryClient = new QueryClient();

// El esqueleto de espera: misma textura del sistema grande.
function Esqueleto() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-4 animate-pulse max-w-sm mx-auto pt-16">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="h-28 bg-gray-200 rounded-2xl"></div>
        <div className="h-28 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  );
}

function Rutas() {
  const { session, cargando } = useAuth();
  if (cargando) return <Esqueleto />;
  if (!session) return <Login />;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={<Placeholder titulo="Agenda" fase="Fase 1" />}
        />
        <Route
          path="cobranza"
          element={<Placeholder titulo="Cobranza" fase="Fase 2" />}
        />
        <Route
          path="leads"
          element={<Placeholder titulo="Leads" fase="Fase 3" />}
        />
        <Route
          path="avisos"
          element={<Placeholder titulo="Avisos" fase="Fase 3" />}
        />
        <Route
          path="inventario"
          element={<Placeholder titulo="Inventario" fase="Fase 4" />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
