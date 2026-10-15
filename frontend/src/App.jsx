import { useEffect, useState } from "react";
import Starfield from "./Starfield.jsx";
import Intro from "./Intro.jsx";

// URL del backend Spring Boot (Render). Se define en .env (local) o en Netlify → Environment variables.
const API_URL = import.meta.env.VITE_API_URL;

const initialForm = { to: "", subject: "", message: "" };

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "idle", text: "" });
  const [ready, setReady] = useState(false);
  const [warp, setWarp] = useState(0);

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
    setWarp(0.35);

    try {
      const res = await fetch(`${API_URL}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setWarp(0);
        setStatus({ type: "error", text: data.error || `Error ${res.status}` });
        return;
      }
      // Salto al hiperespacio: el correo "despega".
      setWarp(1);
      setTimeout(() => setWarp(0), 1400);
      setStatus({ type: "success", text: "Correo enviado. Ya va en camino." });
      setForm(initialForm);
    } catch {
      setWarp(0);
      setStatus({ type: "error", text: "No se pudo conectar con el servidor" });
    }
  }

  return (
    <>
      <Starfield warp={warp} />
      <div className="nebula" aria-hidden="true" />
      <div className="planet" aria-hidden="true" />
      <div className="comet" aria-hidden="true" />

      {!ready && <Intro onDone={() => setReady(true)} />}

      <main className={`container ${ready ? "is-ready" : ""}`}>
        <header className="hero">
          <p className="eyebrow">Transmisión estelar</p>
          <h1 className="title">
            Envía tu mensaje
            <span className="title__glow">a cualquier órbita</span>
          </h1>
          <p className="subtitle">React · Spring Boot · Cloudflare Worker · SendGrid</p>
        </header>

        <form onSubmit={handleSubmit} className={`card ${status.type === "success" ? "card--launched" : ""}`}>
          <label className="field" style={{ "--d": 0 }}>
            <span>Para</span>
            <input name="to" type="email" placeholder="destinatario@correo.com" value={form.to} onChange={handleChange} required />
          </label>

          <label className="field" style={{ "--d": 1 }}>
            <span>Asunto</span>
            <input name="subject" maxLength={200} placeholder="Hola desde el espacio" value={form.subject} onChange={handleChange} required />
          </label>

          <label className="field" style={{ "--d": 2 }}>
            <span>Mensaje</span>
            <textarea name="message" rows={6} maxLength={5000} placeholder="Escribe tu mensaje..." value={form.message} onChange={handleChange} required />
            <small className="counter">{form.message.length} / 5000</small>
          </label>

          <button type="submit" className="launch" disabled={sending} style={{ "--d": 3 }}>
            <span className="launch__label">{sending ? "Despegando..." : "Enviar correo"}</span>
            <span className="launch__shine" aria-hidden="true" />
          </button>

          {sending && <p className="hint">Si el servidor estaba dormido, puede tardar hasta un minuto.</p>}

          {status.type !== "idle" && status.type !== "sending" && (
            <p className={`status ${status.type}`} role="status">{status.text}</p>
          )}
        </form>
      </main>
    </>
  );
}
