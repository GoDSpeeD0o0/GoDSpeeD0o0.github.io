(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Set CSS var for header height so intro is perfectly centered
  const headerEl = document.querySelector("header");
  const setHeaderHeight = () => {
    const hh = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--header-h", `${hh}px`);
  };
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight, { passive: true });

  // UI smoothness respects reduce motion; background is forced to animate
  const reduceMotionPref = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothBehavior = reduceMotionPref ? "auto" : "smooth";

  const FORCE_ANIMATION = true;
  const prefersReducedMotion = !FORCE_ANIMATION && reduceMotionPref;

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

  // ===== Projects: buttons + drag + AUTO-SCROLL every 10s =====
  const track = document.getElementById("projects-track");
  const prev = document.getElementById("projects-prev");
  const next = document.getElementById("projects-next");

  let autoTimer = null;
  let resumeTimer = null;
  const AUTO_SCROLL_MS = 10_000;

  const stopAuto = () => {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    if (!track) return;
    if (autoTimer) return;
    autoTimer = setInterval(() => scrollNextCard(), AUTO_SCROLL_MS);
  };

  const scheduleResume = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!document.hidden) startAuto();
    }, AUTO_SCROLL_MS);
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(resumeTimer);
  };

  const cardDelta = () => {
    if (!track) return 420;
    const card = track.querySelector(".project-card");
    if (!card) return Math.max(360, Math.round(track.clientWidth * 0.9));
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const scrollNextCard = () => {
    if (!track) return;
    const maxLeft = track.scrollWidth - track.clientWidth;
    if (maxLeft <= 0) return;

    const delta = cardDelta();
    const nextLeft = track.scrollLeft + delta;

    if (nextLeft >= maxLeft - 8) {
      track.scrollTo({ left: 0, behavior: smoothBehavior });
    } else {
      track.scrollBy({ left: delta, behavior: smoothBehavior });
    }
  };

  if (track) {
    const scrollAmount = () => cardDelta();

    const nudge = (dir) => {
      pauseAuto();
      track.scrollBy({ left: dir * scrollAmount(), behavior: smoothBehavior });
      scheduleResume();
    };

    if (prev) prev.addEventListener("click", () => nudge(-1));
    if (next) next.addEventListener("click", () => nudge(1));

    // Drag-to-scroll
    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    track.classList.add("grab");

    track.addEventListener("pointerdown", (e) => {
      pauseAuto();
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
      scheduleResume();
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("lostpointercapture", endDrag);

    // Pause while hovering (desktop) so it doesn’t fight the user
    track.addEventListener("mouseenter", pauseAuto);
    track.addEventListener("mouseleave", scheduleResume);

    // Wheel/touch counts as interaction
    track.addEventListener("wheel", () => { pauseAuto(); scheduleResume(); }, { passive: true });
    track.addEventListener("touchstart", pauseAuto, { passive: true });
    track.addEventListener("touchend", scheduleResume, { passive: true });

    // Start the auto-advance
    startAuto();
  }

  // ===== Animated AI/Gaming background + Token Rain =====
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  const SETTINGS = {
    fadeAlpha: 0.14, // long trails

    rain: {
      enabled: true,
      baseAlpha: 0.30,
      fontMin: 12,
      fontMax: 16,
      speedMin: 1.0,
      speedMax: 2.6,
      headRate: 0.18,
      fadeAfterHorizon: true,
    },

    network: { minNodes: 28, maxNodes: 52 },
    stars: { min: 140, max: 260 },
  };

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let w = 0, h = 0, dpr = 1;
  let stars = [];
  let nodes = [];
  let rain = { fontSize: 16, columns: 0, y: [], speed: [] };

  const singleGlyphs =
    "01" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "░▒▓█" +
    "∙•·" +
    "λθμσ∇ΣΔ" +
    "<>/=+*";

  const tokenGlyphs = ["AI", "ML", "∇", "Σ", "θ", "λ", "μ", "Δ", "⊕", "⊗", "∞", "[]", "{}"];

  function pickGlyph() {
    if (Math.random() < 0.08) return tokenGlyphs[(Math.random() * tokenGlyphs.length) | 0];
    return singleGlyphs[(Math.random() * singleGlyphs.length) | 0];
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

    initStars();
    initNetwork();
    initRain();
  }

  function initStars() {
    const count = clamp(Math.round((w * h) / 7000), SETTINGS.stars.min, SETTINGS.stars.max);
    stars = Array.from({ length: count }, () => ({
      x: rand(-1, 1) * w,
      y: rand(-1, 1) * h,
      z: rand(0.12, 1.0),
      s: rand(0.6, 1.25),
    }));
  }

  function initNetwork() {
    const count = clamp(Math.round((w * h) / 26000), SETTINGS.network.minNodes, SETTINGS.network.maxNodes);
    nodes = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h * 0.55),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.14, 0.14),
      r: rand(1.1, 2.2),
    }));
  }

  function initRain() {
    if (!SETTINGS.rain.enabled) return;

    const fs = clamp(Math.round(w / 110), SETTINGS.rain.fontMin, SETTINGS.rain.fontMax);
    rain.fontSize = fs;
    rain.columns = Math.max(28, Math.floor(w / fs));

    const maxRows = Math.ceil(h / fs);

    rain.y = Array.from({ length: rain.columns }, () => rand(-maxRows, 0));
    rain.speed = Array.from({ length: rain.columns }, () => rand(SETTINGS.rain.speedMin, SETTINGS.rain.speedMax));

    ctx.textBaseline = "top";
    ctx.font = `${rain.fontSize}px "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  function drawStarfield(dt) {
    const speed = 0.00022 * dt;
    const f = Math.min(w, h) * 0.55;

    for (const s of stars) {
      s.z -= speed * s.s;
      if (s.z <= 0.12) {
        s.x = rand(-1, 1) * w;
        s.y = rand(-1, 1) * h;
        s.z = 1.0;
        s.s = rand(0.6, 1.25);
      }

      const k = f / (s.z * f + 80);
      const sx = w * 0.5 + s.x * k;
      const sy = h * 0.5 + s.y * k;

      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

      const a = clamp((1.0 - s.z) * 0.40, 0.05, 0.24);
      const size = clamp((1.0 - s.z) * 2.0, 0.6, 2.1);

      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
  }

  function drawAINetwork(dt) {
    for (const p of nodes) {
      p.x += p.vx * dt * 0.02;
      p.y += p.vy * dt * 0.02;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h * 0.55 + 20;
      if (p.y > h * 0.55 + 20) p.y = -20;
    }

    const maxDist = Math.min(160, Math.max(110, w * 0.12));
    const maxDist2 = maxDist * maxDist;

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

    for (const p of nodes) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fill();
    }
  }

  function drawArcadeGrid(t) {
    const horizon = h * 0.63;
    const depth = h - horizon;

    ctx.fillStyle = "rgba(34,211,238,0.016)";
    ctx.fillRect(0, horizon, w, depth);

    const lines = 18;
    const offset = (t * 0.00012) % 1;

    for (let i = 0; i < lines; i++) {
      const d = (i / lines + offset) % 1;
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

    const lanes = 12;
    for (let i = -lanes; i <= lanes; i++) {
      const xBottom = w * 0.5 + (i / lanes) * (w * 0.62);
      ctx.strokeStyle = "rgba(168,85,247,0.050)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xBottom, h);
      ctx.lineTo(w * 0.5, horizon);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(168,85,247,0.028)";
    ctx.fillRect(0, horizon - 1, w, 2);
  }

  function drawTokenRain(dt) {
    if (!SETTINGS.rain.enabled) return;

    const horizon = h * 0.63;
    const rowStep = dt / 16;

    ctx.shadowColor = "rgba(34,211,238,0.30)";
    ctx.shadowBlur = 10;

    for (let i = 0; i < rain.columns; i++) {
      const x = i * rain.fontSize;
      const yPx = rain.y[i] * rain.fontSize;

      let mask = 1;
      if (SETTINGS.rain.fadeAfterHorizon && yPx > horizon) {
        const d = (yPx - horizon) / Math.max(1, h - horizon);
        mask = Math.max(0, 0.35 * (1 - d));
      }

      const isHead = Math.random() < SETTINGS.rain.headRate;
      const glyph = pickGlyph();

      const depthFade = 1 - Math.min(0.70, (yPx / h) * 0.70);
      const a = SETTINGS.rain.baseAlpha * depthFade * mask;

      if (a > 0.005) {
        if (isHead) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, a + 0.25)})`;
        } else {
          const violet = Math.random() < 0.14;
          ctx.fillStyle = violet ? `rgba(168,85,247,${a})` : `rgba(34,211,238,${a})`;
        }
        ctx.fillText(glyph, x, yPx);
      }

      rain.y[i] += rain.speed[i] * rowStep;

      if (yPx > h + 20) {
        rain.y[i] = rand(-Math.ceil(h / rain.fontSize), 0);
        rain.speed[i] = rand(SETTINGS.rain.speedMin, SETTINGS.rain.speedMax);
      }
    }

    ctx.shadowBlur = 0;
  }

  // Background animation (pause when tab hidden)
  let rafId = null;
  let last = performance.now();

  function loop(now) {
    const dt = clamp(now - last, 10, 40);
    last = now;

    ctx.fillStyle = `rgba(5, 7, 18, ${SETTINGS.fadeAlpha})`;
    ctx.fillRect(0, 0, w, h);

    drawStarfield(dt);
    drawArcadeGrid(now);
    drawAINetwork(dt);
    drawTokenRain(dt);

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(34,211,238,0.010)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    rafId = requestAnimationFrame(loop);
  }

  function startBg() {
    if (prefersReducedMotion) return;
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopBg() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // initial clear
  ctx.fillStyle = "rgba(5, 7, 18, 1)";
  ctx.fillRect(0, 0, w, h);

  if (prefersReducedMotion) {
    drawStarfield(16);
    drawArcadeGrid(performance.now());
    drawAINetwork(16);
    drawTokenRain(16);
  } else {
    startBg();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopBg();
      stopAuto();
    } else {
      startBg();
      startAuto();
    }
  });
})();
