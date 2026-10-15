import { useEffect, useRef } from "react";

// Campo de estrellas en canvas: las estrellas vienen hacia la cámara.
// `warp` sube la velocidad (al enviar) y dibuja estelas, como un salto al hiperespacio.
export default function Starfield({ warp = 0 }) {
  const canvasRef = useRef(null);
  const warpRef = useRef(warp);

  useEffect(() => {
    warpRef.current = warp;
  }, [warp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w, h, cx, cy, stars, raf;
    let speed = 0.6;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      const count = w < 700 ? 260 : 600;
      stars = Array.from({ length: count }, () => newStar(true));
    }

    function newStar(anyDepth) {
      return {
        x: (Math.random() - 0.5) * w * 2,
        y: (Math.random() - 0.5) * h * 2,
        z: anyDepth ? Math.random() * w : w,
        pz: 0,
        hue: Math.random() < 0.15 ? 200 + Math.random() * 80 : 0,
      };
    }

    function frame() {
      const target = reduced ? 0.15 : 0.6 + warpRef.current * 38;
      speed += (target - speed) * 0.05;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // Fondo con un poco de transparencia: deja estelas cuando va rápido.
      const trail = Math.min(0.85, 0.12 + speed / 50);
      ctx.fillStyle = `rgba(7, 9, 22, ${1 - trail})`;
      ctx.fillRect(0, 0, w, h);

      const ox = cx + mouse.x * 40;
      const oy = cy + mouse.y * 40;

      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed * 2;
        if (s.z < 1) {
          Object.assign(s, newStar(false));
          s.pz = s.z;
          continue;
        }
        const k = 128 / s.z;
        const x = s.x * k + ox;
        const y = s.y * k + oy;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
          Object.assign(s, newStar(false));
          s.pz = s.z;
          continue;
        }
        const pk = 128 / s.pz;
        const px = s.x * pk + ox;
        const py = s.y * pk + oy;
        const depth = 1 - s.z / w;
        const size = Math.max(0.3, depth * 2.2);
        const alpha = Math.min(1, depth * 1.4);
        const color = s.hue ? `hsla(${s.hue}, 90%, 75%, ${alpha})` : `rgba(235, 240, 255, ${alpha})`;

        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      mouse.tx = e.clientX / w - 0.5;
      mouse.ty = e.clientY / h - 0.5;
    }

    resize();
    ctx.fillStyle = "#070916";
    ctx.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
