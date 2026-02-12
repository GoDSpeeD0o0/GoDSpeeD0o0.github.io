(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    const closeMenu = () => {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      const isHidden = menu.classList.contains("hidden");
      if (isHidden) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
      } else {
        closeMenu();
      }
    });

    // Close after clicking a link
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  // Generative "latent space" background (Canvas)
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0,
    h = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Particle count scales with viewport (keeps performance stable)
  const targetCount = clamp(Math.round((w * h) / 12000), 70, 140);

  const particles = Array.from({ length: targetCount }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.2, 0.2),
    vy: rand(-0.2, 0.2),
    r: rand(1.0, 2.0),
  }));

  function field(x, y, t) {
    // Cheap “vector field” using trig — looks like a soft swirling latent space.
    const nx = (x - w * 0.5) / w;
    const ny = (y - h * 0.5) / h;

    const a = Math.sin(nx * 6 + t * 0.00025) + Math.cos(ny * 5 - t * 0.0002);
    const b = Math.cos(nx * 5 - t * 0.00023) - Math.sin(ny * 6 + t * 0.00027);

    // Rotate a/b slightly for curl-ish motion
    const fx = a * 0.6 + b * 0.2;
    const fy = b * 0.6 - a * 0.2;
    return { fx, fy };
  }

  function drawFrame(t) {
    // Fade to create trails
    ctx.fillStyle = "rgba(5, 7, 18, 0.18)";
    ctx.fillRect(0, 0, w, h);

    // Connections
    const maxDist = Math.min(160, Math.max(110, w * 0.12));
    const maxDist2 = maxDist * maxDist;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const f = field(p.x, p.y, t);
      p.vx = p.vx * 0.92 + f.fx * 0.18;
      p.vy = p.vy * 0.92 + f.fy * 0.18;

      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();

      // Lines to nearby particles (O(n^2) but small n)
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxDist2) {
          const a = 1 - d2 / maxDist2;
          ctx.strokeStyle = `rgba(34,211,238,${0.22 * a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // A second glow pass for depth
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(168,85,247,0.05)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  function loop(t) {
    drawFrame(t);
    requestAnimationFrame(loop);
  }

  // If user prefers reduced motion: render one still frame
  if (reduceMotion) {
    ctx.fillStyle = "rgba(5, 7, 18, 1)";
    ctx.fillRect(0, 0, w, h);
    drawFrame(0);
  } else {
    // Initial clear
    ctx.fillStyle = "rgba(5, 7, 18, 1)";
    ctx.fillRect(0, 0, w, h);
    requestAnimationFrame(loop);
  }
})();
