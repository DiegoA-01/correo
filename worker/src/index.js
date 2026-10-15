// Cloudflare Worker (serverless): recibe la petición del backend Spring Boot y envía el correo con Resend.
// Solo acepta llamadas que traigan el header X-Internal-Key con el valor de INTERNAL_API_KEY.
// La API key de Resend vive como secreto del Worker (RESEND_API_KEY), nunca en el backend ni en el frontend.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function json(body, status) {
  return Response.json(body, { status });
}

// Compara en tiempo constante para no filtrar la clave por diferencias de tiempo.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json({ error: "Método no permitido" }, 405);
    }

    if (!env.INTERNAL_API_KEY || !env.RESEND_API_KEY || !env.FROM_EMAIL) {
      return json({ error: "El Worker no está configurado (falta INTERNAL_API_KEY, RESEND_API_KEY o FROM_EMAIL)" }, 500);
    }

    const key = request.headers.get("X-Internal-Key") ?? "";
    if (!safeEqual(key, env.INTERNAL_API_KEY)) {
      return json({ error: "No autorizado" }, 401);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ error: "El cuerpo debe ser JSON" }, 400);
    }

    const to = String(data.to ?? "").trim();
    const subject = String(data.subject ?? "").trim();
    const message = String(data.message ?? "").trim();

    if (!EMAIL_RE.test(to)) return json({ error: "Correo de destino inválido" }, 400);
    if (!subject || subject.length > MAX_SUBJECT) return json({ error: `El asunto es obligatorio (máx. ${MAX_SUBJECT} caracteres)` }, 400);
    if (!message || message.length > MAX_MESSAGE) return json({ error: `El mensaje es obligatorio (máx. ${MAX_MESSAGE} caracteres)` }, 400);

    const from = env.FROM_NAME ? `${env.FROM_NAME} <${env.FROM_EMAIL}>` : env.FROM_EMAIL;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: message }),
    });

    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return json({ error: "Resend no pudo enviar el correo" }, 502);
    }

    const { id } = await res.json();
    return json({ ok: true, id }, 200);
  },
};
