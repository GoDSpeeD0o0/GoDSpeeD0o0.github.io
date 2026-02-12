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

  // Smoothness respects reduce motion for UI, but background is forced to animate
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

    // loop
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

    // Start/stop auto ONLY when section is visible
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

  // ===== 3) New gaming+AI background =====
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const SETTINGS = {
    bgFade: 0.22, // higher = less trails, cleaner visuals
    stars: { min: 80, max: 170 },
    mesh: { minNodes: 22, maxNodes: 44 },
    shards: { min: 34, max: 78 },
  };

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let w = 0, h = 0, dpr = 1;

  let stars = [];
  let nodes = [];
  let shards = [];

  const COLORS = {
    bg: "rgba(9, 14, 30, ", // alpha appended
    cyan: "rgba(34,211,238,",
    violet: "rgba(168,85,247,",
    white: "rgba(255,255,255,",
  };

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
    initMesh();
    initShards();

    // initial clear
    ctx.fillStyle = "rgba(9, 14, 30, 1)";
    ctx.fillRect(0, 0, w, h);
  }

  function initStars() {
    const count = clamp(Math.round((w * h) / 10000), SETTINGS.stars.min, SETTINGS.stars.max);
    stars = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.5, 1.6),
      a: rand(0.06, 0.22),
      vy: rand(0.010, 0.040),
      vx: rand(-0.008, 0.008),
    }));
  }

  function initMesh() {
    const count = clamp(Math.round((w * h) / 32000), SETTINGS.mesh.minNodes, SETTINGS.mesh.maxNodes);
    nodes = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h * 0.62),
      vx: rand(-0.16, 0.16),
      vy: rand(-0.12, 0.12),
      r: rand(1.0, 2.1),
    }));
  }

  function initShards() {
    const count = clamp(Math.round((w * h) / 26000), SETTINGS.shards.min, SETTINGS.shards.max);
    shards = Array.from({ length: count }, () => {
      const kind = (Math.random() * 3) | 0; // 0 diamond, 1 tri, 2 square
      const tint = Math.random() < 0.55 ? "cyan" : "violet";
      return {
        x: rand(0, w),
        y: rand(0, h),
        size: rand(2.2, 6.2),
        vx: rand(-0.20, 0.20),
        vy: rand(0.18, 0.55),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.0025, 0.0025),
        a: rand(0.06, 0.18),
        kind,
        tint,
      };
    });
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  function drawStars(dt) {
    const k = dt * 0.06;
    for (const s of stars) {
      s.x += s.vx * k * 60;
      s.y += s.vy * k * 60;

      if (s.y > h + 10) s.y = -10;
      if (s.x < -10) s.x = w + 10;
      if (s.x > w + 10) s.x = -10;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `${COLORS.white}${s.a})`;
      ctx.fill();
    }
  }

  function drawMesh(dt) {
    // move nodes
    for (const p of nodes) {
      p.x += p.vx * dt * 0.02;
      p.y += p.vy * dt * 0.02;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h * 0.62 + 20;
      if (p.y > h * 0.62 + 20) p.y = -20;
    }

    const maxDist = Math.min(170, Math.max(120, w * 0.14));
    const maxDist2 = maxDist * maxDist;

    // links
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < maxDist2) {
          const p = 1 - d2 / maxDist2;
          const alpha = 0.07 * p; // softer
          ctx.strokeStyle = `${COLORS.cyan}${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const p of nodes) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${COLORS.white}0.22)`;
      ctx.fill();
    }
  }

  function drawSynthGrid(t) {
    const horizon = h * 0.68;
    const depth = h - horizon;

    // soft floor glow
    ctx.fillStyle = "rgba(34,211,238,0.012)";
    ctx.fillRect(0, horizon, w, depth);

    // moving horizontals
    const lines = 18;
    const offset = (t * 0.00010) % 1;

    for (let i = 0; i < lines; i++) {
      const d = (i / lines + offset) % 1;
      const y = horizon + (d * d) * depth;

      const halfWidth = (w * 0.06) + (d * d) * (w * 0.58);
      const alpha = 0.028 + d * 0.055;

      ctx.strokeStyle = `${COLORS.cyan}${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - halfWidth, y);
      ctx.lineTo(w * 0.5 + halfWidth, y);
      ctx.stroke();
    }

    // perspective verticals (very soft violet)
    const lanes = 12;
    for (let i = -lanes; i <= lanes; i++) {
      const xBottom = w * 0.5 + (i / lanes) * (w * 0.62);
      ctx.strokeStyle = `${COLORS.violet}0.030)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xBottom, h);
      ctx.lineTo(w * 0.5, horizon);
      ctx.stroke();
    }

    // horizon line
    ctx.fillStyle = "rgba(168,85,247,0.020)";
    ctx.fillRect(0, horizon - 1, w, 2);
  }

  function drawShards(dt) {
    const horizon = h * 0.68;
    const k = dt * 0.06;

    for (const s of shards) {
      s.x += s.vx * k * 60;
      s.y += s.vy * k * 60;
      s.rot += s.vr * dt;

      if (s.y > h + 30) s.y = -30;
      if (s.x < -30) s.x = w + 30;
      if (s.x > w + 30) s.x = -30;

      // fade down below horizon so content stays readable
      let mask = 1;
      if (s.y > horizon) {
        const d = (s.y - horizon) / Math.max(1, h - horizon);
        mask = Math.max(0, 0.55 * (1 - d));
      }

      const color = s.tint === "cyan" ? COLORS.cyan : COLORS.violet;
      const a = s.a * mask;

      if (a < 0.01) continue;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      ctx.fillStyle = `${color}${a})`;
      ctx.shadowColor = `${color}${Math.min(0.12, a)})`;
      ctx.shadowBlur = 10;

      const z = s.size;

      if (s.kind === 0) {
        // diamond
        ctx.beginPath();
        ctx.moveTo(0, -z);
        ctx.lineTo(z, 0);
        ctx.lineTo(0, z);
        ctx.lineTo(-z, 0);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 1) {
        // triangle
        ctx.beginPath();
        ctx.moveTo(0, -z);
        ctx.lineTo(z, z);
        ctx.lineTo(-z, z);
        ctx.closePath();
        ctx.fill();
      } else {
        // square
        ctx.fillRect(-z * 0.75, -z * 0.75, z * 1.5, z * 1.5);
      }

      ctx.restore();
    }

    ctx.shadowBlur = 0;
  }

  function drawHudPulse(t) {
    // subtle diagonal scan (very low alpha)
    const phase = (t * 0.00006) % 1;
    const x = phase * (w + 320) - 160;

    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 220, h);
    ctx.stroke();
  }

  // animation loop
  let rafId = null;
  let last = performance.now();

  function loop(now) {
    const dt = clamp(now - last, 10, 40);
    last = now;

    // fade
    ctx.fillStyle = `${COLORS.bg}${SETTINGS.bgFade})`;
    ctx.fillRect(0, 0, w, h);

    drawStars(dt);
    drawHudPulse(now);
    drawMesh(dt);
    drawShards(dt);
    drawSynthGrid(now);

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
