(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header height -> CSS var
  const headerEl = document.querySelector("header");
  const setHeaderHeight = () => {
    const hh = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--header-h", `${hh}px`);
  };
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight, { passive: true });

  const reduceMotionPref = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothBehavior = reduceMotionPref ? "auto" : "smooth";

  // keep background animated (your preference)
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

  // ===== Projects drawer: buttons + drag + auto-advance =====
  const projectsSection = document.getElementById("projects");
  const track = document.getElementById("projects-track");
  const prev = document.getElementById("projects-prev");
  const next = document.getElementById("projects-next");

  const AUTO_SCROLL_MS = 10_000;
  const RESUME_AFTER_MS = 2200;

  let autoTimer = null;
  let resumeTimer = null;
  let projectsInView = false;

  const stopAuto = () => {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    if (!track) return;
    if (!projectsInView) return;
    if (document.hidden) return;
    if (autoTimer) return;
    autoTimer = setInterval(scrollNext, AUTO_SCROLL_MS);
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(resumeTimer);
  };

  const scheduleResume = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => startAuto(), RESUME_AFTER_MS);
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const cardDelta = () => {
    if (!track) return 520;
    const card = track.querySelector(".project-card");
    if (!card) return Math.max(360, Math.round(track.clientWidth * 0.9));
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.gap || styles.columnGap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const scrollNext = () => {
    if (!track) return;
    const maxLeft = track.scrollWidth - track.clientWidth;
    if (maxLeft <= 0) return;

    if (track.scrollLeft >= maxLeft - 8) {
      track.scrollTo({ left: 0, behavior: smoothBehavior });
      return;
    }
    track.scrollBy({ left: cardDelta(), behavior: smoothBehavior });
  };

  if (track && projectsSection) {
    const nudge = (dir) => {
      pauseAuto();
      track.scrollBy({ left: dir * cardDelta(), behavior: smoothBehavior });
      scheduleResume();
    };

    if (prev) prev.addEventListener("click", () => nudge(-1));
    if (next) next.addEventListener("click", () => nudge(1));

    // drag-to-scroll
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

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        projectsInView = !!entry?.isIntersecting && entry.intersectionRatio >= 0.25;
        if (projectsInView) startAuto();
        else stopAuto();
      },
      { threshold: [0, 0.25, 0.6, 1] }
    );
    io.observe(projectsSection);
  }

  // ===== Smooth + minimal background (Aurora Drift) =====
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const rand = (min, max) => min + Math.random() * (max - min);

  const BG = {
    // Perf knobs
    dprMax: 1.75,          // important for smoothness on retina
    targetFrameMs: 16,     // ~60fps cap
    maxStepMs: 33,

    // Density
    particleMin: 46,
    particleMax: 96,
    pulseMax: 4,

    // Look
    base: "rgba(7, 11, 24, 1)",
    aurora: [
      { c: [34, 211, 238], a: 0.13, r: 0.86, bx: 0.22, by: 0.28, ax: 0.10, ay: 0.08, sx: 0.00012, sy: 0.00010, px: 0.0, py: 0.0 },
      { c: [168, 85, 247], a: 0.11, r: 0.90, bx: 0.80, by: 0.30, ax: 0.11, ay: 0.09, sx: 0.00011, sy: 0.00009, px: 1.7, py: 0.9 },
      { c: [56, 189, 248], a: 0.06, r: 0.78, bx: 0.52, by: 0.52, ax: 0.07, ay: 0.06, sx: 0.00013, sy: 0.00008, px: 3.0, py: 2.1 }
    ],
  };

  let w = 0, h = 0, dpr = 1;
  let particles = [];
  let pulses = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, BG.dprMax);
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
    pulses = [];
    ctx.fillStyle = BG.base;
    ctx.fillRect(0, 0, w, h);
  }

  function initParticles() {
    const target = clamp(Math.round((w * h) / 17000), BG.particleMin, BG.particleMax);

    particles = Array.from({ length: target }, () => {
      const accent = Math.random() < 0.16;
      return {
        x: Math.random() * w,
        y: Math.random() * h,

        // px/sec (slow, smooth)
        vx: rand(-10, 10),
        vy: rand(8, 26),

        s: rand(0.9, 1.9),
        a: rand(0.06, 0.18),

        accent,
        tint: Math.random() < 0.5 ? "cyan" : "violet",

        // twinkle phase
        ph: rand(0, Math.PI * 2)
      };
    });
  }

  function drawAurora(t) {
    // Base
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG.base;
    ctx.fillRect(0, 0, w, h);

    // Aurora blobs
    ctx.globalCompositeOperation = "lighter";
    const s = Math.min(w, h);

    for (const b of BG.aurora) {
      const x = w * (b.bx + Math.sin(t * b.sx + b.px) * b.ax);
      const y = h * (b.by + Math.cos(t * b.sy + b.py) * b.ay);
      const r = s * b.r;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.a})`);
      g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function updateParticles(dt) {
    const k = dt / 1000;
    for (const p of particles) {
      p.x += p.vx * k;
      p.y += p.vy * k;

      // wrap
      if (p.y > h + 10) p.y = -10;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
  }

  function maybeSpawnPulse(dt) {
    if (pulses.length >= BG.pulseMax) return;

    // ~0.12 pulses/sec (very low)
    const chance = (dt / 1000) * 0.12;
    if (Math.random() < chance) {
      pulses.push({
        x: rand(w * 0.18, w * 0.82),
        y: rand(h * 0.18, h * 0.62),
        r: 0,
        vr: rand(90, 150),        // px/sec
        a: 0.16,
        tint: Math.random() < 0.5 ? "cyan" : "violet",
      });
    }
  }

  function updatePulses(dt) {
    const k = dt / 1000;
    for (const p of pulses) {
      p.r += p.vr * k;
      p.a *= Math.exp(-dt / 1100);
    }
    pulses = pulses.filter((p) => p.a > 0.02 && p.r < Math.max(w, h) * 1.2);
  }

  function drawPulses() {
    for (const p of pulses) {
      const col = p.tint === "cyan" ? "34,211,238" : "168,85,247";
      ctx.strokeStyle = `rgba(${col},${p.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles(t) {
    for (const p of particles) {
      const tw = 0.70 + 0.30 * Math.sin(t * 0.001 + p.ph);
      const a = p.a * tw;

      if (!p.accent) {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
      } else {
        const col = p.tint === "cyan" ? "34,211,238" : "168,85,247";
        ctx.fillStyle = `rgba(${col},${0.07 + a})`; // still subtle
      }

      // ultra-light draw (fast)
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Animation loop with ~60fps cap even on high refresh displays
  let rafId = null;
  let last = performance.now();
  let accum = 0;

  function loop(now) {
    const dtRaw = now - last;
    last = now;

    const dt = clamp(dtRaw, 0, BG.maxStepMs);
    accum += dt;

    if (accum < BG.targetFrameMs) {
      rafId = requestAnimationFrame(loop);
      return;
    }

    const step = Math.min(accum, BG.maxStepMs);
    accum = 0;

    drawAurora(now);
    updateParticles(step);
    maybeSpawnPulse(step);
    updatePulses(step);
    drawPulses();
    drawParticles(now);

    rafId = requestAnimationFrame(loop);
  }

  function startBg() {
    if (prefersReducedMotion) return;
    if (rafId) return;
    last = performance.now();
    accum = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopBg() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (!prefersReducedMotion) startBg();

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
