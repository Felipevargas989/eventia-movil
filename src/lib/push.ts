// Activar las notificaciones de este teléfono: pide permiso, se
// suscribe con la llave pública del backend y registra el dispositivo.
// Al final dispara un push de PRUEBA para que se vea al tiro.
import { apiRequest } from "./api";

const aUint8 = (base64: string) => {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...b].map((c) => c.charCodeAt(0)));
};

export const pushSoportado = () =>
  "serviceWorker" in navigator && "PushManager" in window;

export const activarPush = async (): Promise<
  "activado" | "denegado" | "error"
> => {
  try {
    if (!pushSoportado()) return "error";
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return "denegado";
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await apiRequest<{ publicKey: string }>(
      "/movil/push/clave-publica",
      "GET",
    );
    if (!publicKey) return "error";
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: aUint8(publicKey),
    });
    const llaves = sub.toJSON().keys ?? {};
    await apiRequest("/movil/push/dispositivos", "POST", {
      endpoint: sub.endpoint,
      p256dh: llaves.p256dh,
      auth: llaves.auth,
    });
    await apiRequest("/movil/push/probar", "POST");
    return "activado";
  } catch {
    return "error";
  }
};
