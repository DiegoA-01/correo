// Cloudflare Worker (serverless): recibe la petición del backend Spring Boot y envía el correo con SendGrid.
// Solo acepta llamadas que traigan el header X-Internal-Key con el valor de INTERNAL_API_KEY.
// La API key de SendGrid vive como secreto del Worker (SENDGRID_API_KEY), nunca en el backend ni en el frontend.

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

    if (!env.INTERNAL_API_KEY || !env.SENDGRID_API_KEY || !env.FROM_EMAIL) {
      return json({ error: "El Worker no está configurado (falta INTERNAL_API_KEY, SENDGRID_API_KEY o FROM_EMAIL)" }, 500);
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

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: env.FROM_EMAIL, name: env.FROM_NAME || undefined },
        subject,
        content: [{ type: "text/plain", value: message }],
      }),
    });

    if (!res.ok) {
      console.error("SendGrid error", res.status, await res.text());
      return json({ error: "SendGrid no pudo enviar el correo" }, 502);
    }

    // SendGrid responde 202 sin cuerpo; el id del mensaje viene en este header.
    const id = res.headers.get("X-Message-Id");
    return json(id ? { ok: true, id } : { ok: true }, 200);
  },
};
