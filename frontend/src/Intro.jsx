import { useEffect, useState } from "react";

const KEY = "intro-vista";

function shouldPlay() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return sessionStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

// Intro tipo Netflix: el logo se enciende con brillo, se acerca y la cámara lo atraviesa.
// Se muestra una vez por sesión y se puede saltar con un clic.
export default function Intro({ onDone }) {
  const [play] = useState(shouldPlay);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!play) {
      onDone();
      return;
    }
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(finish, 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* sin almacenamiento: la intro saldrá otra vez, no pasa nada */
    }
    onDone();
  }

  if (!play) return null;

  return (
    <div className={`intro ${leaving ? "intro--leaving" : ""}`} onClick={finish} role="presentation">
      <div className="intro__logo" aria-hidden="true">
        {"CORREO".split("").map((ch, i) => (
          <span key={i} style={{ "--i": i }}>{ch}</span>
        ))}
      </div>
      <div className="intro__beam" aria-hidden="true" />
      <button type="button" className="intro__skip" onClick={finish}>
        Saltar intro
      </button>
    </div>
  );
}
