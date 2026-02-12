(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothBehavior = prefersReducedMotion ? "auto" : "smooth";

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

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  // Horizontal projects controls + drag-to-scroll
  const track = document.getElementById("projects-track");
  const prev = document.getElementById("projects-prev");
  const next = document.getElementById("projects-next");

  if (track) {
    const scrollAmount = () => Math.max(320, Math.round(track.clientWidth * 0.85));

    if (prev) {
      prev.addEventListener("click", () => {
        track.scrollBy({ left: -scrollAmount(), behavior: smoothBehavior });
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        track.scrollBy({ left: scrollAmount(), behavior: smoothBehavior });
      });
    }

    // Pointer drag (desktop “grab to scroll”)
    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    track.classList.add("grab");

    track.addEventListener("pointerdown", (e) => {
      isDown = true;
      track.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add("grabbing");
    });

    track.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startLeft - dx;
    });

    const endDrag = () => {
      isDown = false;
      track.classList.remove("grabbing");
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("lostpointercapture", endDrag);
  }

  // Animated gaming-style background (dark arcade grid + starfield + subtle “AI network”)
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  let w = 0, h = 0, dpr = 1;
  let stars = [];
  let nodes = [];

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function initStarsAndNodes() {
    const starCount = clamp(Math.round((w * h) / 7000), 140, 280);
    stars = Array.from({ length: starCount }, () => ({
      // 3D-ish starfield
      x: rand(-1, 1) * w,
      y: rand(-1, 1) * h,
      z: rand(0.12, 1.0),
      s: rand(0.6, 1.25),
    }));

    const nodeCount = clamp(Math.round((w * h) / 24000), 32, 56);
    nodes = Array.from({ length: nodeCount }, () => ({
      x: rand(0, w),
      y: rand(0, h * 0.55), // keep “AI network” mostly in top half
      vx: rand(-0.18, 0.18),
      vy: rand(-0.14, 0.14),
      r: rand(1.1, 2.2),
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStarsAndNodes();
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  function drawStarfield(dt) {
    const speed = 0.00022 * dt; // subtle
    const f = Math.min(w, h) * 0.55;

    for (const s of stars) {
      s.z -= speed * s.s;
      if (s.z <= 0.12) {
        s.x = rand(-1, 1) * w;
        s.y = rand(-1, 1) * h;
        s.z = 1.0;
        s.s = rand(0.6, 1.25);
      }

      const k = f / (s.z * f + 80); // keeps it from exploding too fast
      const sx = w * 0.5 + s.x * k;
      const sy = h * 0.5 + s.y * k;

      // cull
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

      const a = clamp((1.0 - s.z) * 0.42, 0.05, 0.26);
      const size = clamp((1.0 - s.z) * 2.2, 0.6, 2.2);

      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
  }

  function drawArcadeGrid(t) {
    const horizon = h * 0.63;
    const depth = h - horizon;

    // faint glow ground
    ctx.fillStyle = "rgba(34,211,238,0.018)";
    ctx.fillRect(0, horizon, w, depth);

    // horizontal lines (move “towards” viewer)
    const lines = 18;
    const offset = (t * 0.00012) % 1;

    for (let i = 0; i < lines; i++) {
      const d = (i / lines + offset) % 1; // 0..1
      const y = horizon + (d * d) * depth;

      const halfWidth = (w * 0.06) + (d * d) * (w * 0.58);
      const alpha = 0.04 + d * 0.08;

      ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - halfWidth, y);
      ctx.lineTo(w * 0.5 + halfWidth, y);
      ctx.stroke();
    }

    // vertical lines
    const lanes = 12;
    for (let i = -lanes; i <= lanes; i++) {
      const xBottom = w * 0.5 + (i / lanes) * (w * 0.62);
      ctx.strokeStyle = "rgba(168,85,247,0.055)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xBottom, h);
      ctx.lineTo(w * 0.5, horizon);
      ctx.stroke();
    }

    // small horizon glow
    ctx.fillStyle = "rgba(168,85,247,0.03)";
    ctx.fillRect(0, horizon - 1, w, 2);
  }

  function drawAINetwork(dt) {
    // move nodes gently
    for (const p of nodes) {
      p.x += p.vx * dt * 0.02;
      p.y += p.vy * dt * 0.02;

      // wrap in top half
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h * 0.55 + 20;
      if (p.y > h * 0.55 + 20) p.y = -20;
    }

    const maxDist = Math.min(160, Math.max(110, w * 0.12));
    const maxDist2 = maxDist * maxDist;

    // connections
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < maxDist2) {
          const p = 1 - d2 / maxDist2;
          ctx.strokeStyle = `rgba(34,211,238,${0.10 * p})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // node dots
    for (const p of nodes) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fill();
    }
  }

  let last = performance.now();

  function frame(now) {
    const dt = clamp(now - last, 10, 40);
    last = now;

    // trail fade (keeps motion smooth + dark)
    ctx.fillStyle = "rgba(5, 7, 18, 0.22)";
    ctx.fillRect(0, 0, w, h);

    drawStarfield(dt);
    drawAINetwork(dt);
    drawArcadeGrid(now);

    // subtle additive glow pass
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(34,211,238,0.010)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    if (!prefersReducedMotion) requestAnimationFrame(frame);
  }

  // initial clear
  ctx.fillStyle = "rgba(5, 7, 18, 1)";
  ctx.fillRect(0, 0, w, h);

  if (prefersReducedMotion) {
    // render a single still frame
    drawStarfield(16);
    drawAINetwork(16);
    drawArcadeGrid(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
})();
