import { useEffect, useRef } from "react";

const MatrixRain = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let fontSize = 16;
    let columns = Math.floor(canvas.offsetWidth / fontSize); // Use offsetWidth
    let drops = [];
    const speed = 0.12; // slower base speed for hacker vibe
    const alpha = 0.06; // slightly longer trail persistence

    const initDrops = () => {
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(0);
    }

    const resize = () => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      initDrops();
    };

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? "0" : "1";
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Random green shades
        ctx.fillStyle = Math.random() > 0.98 ? "#b3ffd9" : "#00c477";
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.99) {
          drops[i] = 0;
        }
        drops[i] += speed * (0.6 + Math.random() * 0.35); // gentler varied drop speed
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ background: 'black' }}
    />
  );
};

export default MatrixRain;
