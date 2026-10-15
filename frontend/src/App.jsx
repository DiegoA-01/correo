import { useEffect, useState } from "react";

// URL del backend Spring Boot (Render). Se define en .env (local) o en Netlify → Environment variables.
const API_URL = import.meta.env.VITE_API_URL;

const initialForm = { to: "", subject: "", message: "" };

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "idle", text: "" });

  const sending = status.type === "sending";

  // En el plan gratis Render duerme el backend; lo despertamos apenas carga la página.
  useEffect(() => {
    fetch(`${API_URL}/api/health`).catch(() => {});
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ type: "sending", text: "Enviando..." });

    try {
      const res = await fetch(`${API_URL}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "error", text: data.error || `Error ${res.status}` });
        return;
      }
      setStatus({ type: "success", text: "Correo enviado correctamente" });
      setForm(initialForm);
    } catch {
      setStatus({ type: "error", text: "No se pudo conectar con el servidor" });
    }
  }

  return (
    <main className="container">
      <h1>Envío de Correos</h1>
      <p className="subtitle">React · Spring Boot · Cloudflare Worker · Resend</p>

      <form onSubmit={handleSubmit} className="card">
        <label>
          Para
          <input name="to" type="email" placeholder="destinatario@correo.com" value={form.to} onChange={handleChange} required />
        </label>

        <label>
          Asunto
          <input name="subject" maxLength={200} value={form.subject} onChange={handleChange} required />
        </label>

        <label>
          Mensaje
          <textarea name="message" rows={6} maxLength={5000} value={form.message} onChange={handleChange} required />
        </label>

        <button type="submit" disabled={sending}>
          {sending ? "Enviando..." : "Enviar correo"}
        </button>

        {sending && (
          <p className="hint">Si el servidor estaba dormido, puede tardar hasta un minuto.</p>
        )}

        {status.type !== "idle" && status.type !== "sending" && (
          <p className={`status ${status.type}`} role="status">{status.text}</p>
        )}
      </form>
    </main>
  );
}
