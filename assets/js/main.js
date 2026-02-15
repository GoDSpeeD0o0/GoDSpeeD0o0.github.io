(() => {
  // =========================
  // Utilities
  // =========================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const parseDelayMs = (s) => {
    if (!s) return 0;
    const v = parseFloat(s);
    if (Number.isNaN(v)) return 0;
    if (s.includes("ms")) return v;
    if (s.includes("s")) return v * 1000;
    return v;
  };

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

  // Reduced motion preference
  const reduceMotionPref = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Keep background animated (theme is subtle, so safe)
  const FORCE_ANIMATION = true;
  const prefersReducedMotion = !FORCE_ANIMATION && reduceMotionPref;

  // =========================
  // Mobile menu
  // =========================
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    const closeMenu = () => {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
      setHeaderHeight();
    };

    btn.addEventListener("click", () => {
      const isHidden = menu.classList.contains("hidden");
      if (isHidden) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
      } else {
        closeMenu();
      }
      setHeaderHeight();
    });

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  // =========================
  // Scroll progress
  // =========================
  const progressBar = document.getElementById("scroll-progress-bar");
  if (progressBar) {
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = clamp(scrollTop / max, 0, 1);
      progressBar.style.transform = `scaleX(${p})`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => update(), { passive: true });
    update();
  }

  // =========================
  // Scroll reveal + glint + chip cascade
  // =========================
  const revealTargets = Array.from(document.querySelectorAll("main .os-header, main .glass"));

  if (revealTargets.length) {
    if (reduceMotionPref) {
      revealTargets.forEach((el) => el.classList.add("reveal", "is-visible"));
    } else {
      revealTargets.forEach((el, i) => {
        el.classList.add("reveal");
        el.style.transitionDelay = `${Math.min(180, (i % 8) * 22)}ms`;
      });

      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;

            const el = e.target;
            const baseDelay = parseDelayMs(el.style.transitionDelay);

            if (el.classList.contains("skill-card")) {
              const pills = Array.from(el.querySelectorAll(".pill"));
              pills.forEach((pill, idx) => {
                pill.style.transitionDelay = `${baseDelay + 120 + idx * 45}ms`;
              });
            }

            el.classList.add("is-visible");

            if (el.classList.contains("glass")) {
              window.setTimeout(() => el.classList.add("glint"), baseDelay + 160);
            }

            io.unobserve(el);
          }
        },
        { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
      );

      revealTargets.forEach((el) => io.observe(el));
    }
  }

  // =========================
  // Projects drawer (pin = click, open repo = double click)
  // =========================
  const projectsSection = document.getElementById("projects");
  const track = document.getElementById("projects-track");
  const prev = document.getElementById("projects-prev");
  const next = document.getElementById("projects-next");
  const dotsEl = document.getElementById("projects-dots");
  const currentEl = document.getElementById("projects-current");
  const totalEl = document.getElementById("projects-total");

  const AUTO_SCROLL_MS = 10_000;
  const RESUME_AFTER_MS = 2200;

  let autoTimer = null;
  let resumeTimer = null;
  let projectsInView = false;

  let manualLock = false;
  let selectedIndex = 0;
  let lastDragTime = 0;

  let startAuto = () => {};
  let stopAuto = () => {};

  if (track && projectsSection) {
    const getCards = () => Array.from(track.querySelectorAll(".project-card"));

    const normIndex = (idx) => {
      const cards = getCards();
      if (cards.length === 0) return 0;
      return ((idx % cards.length) + cards.length) % cards.length;
    };

    const getTrackPadLeft = () => {
      const s = getComputedStyle(track);
      return parseFloat(s.paddingLeft || "0") || 0;
    };

    const scrollToCard = (idx, smooth) => {
      const cards = getCards();
      if (cards.length === 0) return;

      const i = normIndex(idx);
      const padLeft = getTrackPadLeft();
      const left = Math.max(0, cards[i].offsetLeft - padLeft);
      track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };

    const getScrollActiveIndex = () => {
      const cards = getCards();
      if (cards.length === 0) return 0;

      const center = track.scrollLeft + track.clientWidth * 0.5;
      let best = 0;
      let bestD = Infinity;

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const cx = c.offsetLeft + c.offsetWidth * 0.5;
        const d = Math.abs(cx - center);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const getActiveIndex = () => (manualLock ? normIndex(selectedIndex) : getScrollActiveIndex());

    const updateProjectsUI = () => {
      const cards = getCards();
      if (cards.length === 0) return;

      const idx = getActiveIndex();

      cards.forEach((c, i) => {
        c.classList.toggle("is-active", i === idx);
        c.classList.toggle("is-dim", i !== idx);
      });

      const dots = Array.from(dotsEl?.querySelectorAll(".dot") || []);
      dots.forEach((d, i) => d.classList.toggle("active", i === idx));

      if (currentEl) currentEl.textContent = String(idx + 1).padStart(2, "0");
      if (totalEl) totalEl.textContent = String(cards.length).padStart(2, "0");
    };

    const pauseAutoInternal = () => {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
      clearTimeout(resumeTimer);
    };

    stopAuto = () => pauseAutoInternal();

    startAuto = () => {
      if (!track) return;
      if (!projectsInView) return;
      if (document.hidden) return;
      if (manualLock) return;
      if (autoTimer) return;

      autoTimer = setInterval(() => {
        if (manualLock) return;
        scrollToCard(getScrollActiveIndex() + 1, true);
        updateProjectsUI();
      }, AUTO_SCROLL_MS);
    };

    const scheduleResume = () => {
      if (manualLock) return;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => startAuto(), RESUME_AFTER_MS);
    };

    const lockToIndex = (idx, smooth = true) => {
      manualLock = true;
      selectedIndex = normIndex(idx);
      pauseAutoInternal();
      scrollToCard(selectedIndex, smooth);
      updateProjectsUI();
    };

    const unlockSelection = () => {
      if (!manualLock) return;
      manualLock = false;
      updateProjectsUI();
      startAuto();
    };

    const openRepoForCard = (cardEl) => {
      const url = cardEl?.dataset?.repo;
      if (!url) return;
      window.open(url, "_blank", "noopener");
    };

    const cards = getCards();
    if (totalEl) totalEl.textContent = String(cards.length).padStart(2, "0");

    if (dotsEl) {
      dotsEl.innerHTML = "";
      cards.forEach((_, i) => {
        const b = document.createElement("button");
        b.className = "dot";
        b.type = "button";
        b.setAttribute("aria-label", `Go to project ${i + 1}`);
        b.addEventListener("click", () => lockToIndex(i, true));
        dotsEl.appendChild(b);
      });
    }

    prev?.addEventListener("click", () => lockToIndex(getActiveIndex() - 1, true));
    next?.addEventListener("click", () => lockToIndex(getActiveIndex() + 1, true));

    cards.forEach((card, i) => {
      card.addEventListener("click", () => {
        if (performance.now() - lastDragTime < 240) return;
        lockToIndex(i, true);
      });

      card.addEventListener("dblclick", () => {
        if (performance.now() - lastDragTime < 240) return;
        openRepoForCard(card);
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openRepoForCard(card);
        }
      });
    });

    let pointerActive = false;
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let pid = null;
    const DRAG_THRESHOLD = 7;

    track.classList.add("grab");

    const endPointer = () => {
      if (!pointerActive) return;
      pointerActive = false;

      if (dragging) {
        dragging = false;
        track.classList.remove("grabbing");
        lastDragTime = performance.now();
        updateProjectsUI();
        scheduleResume();
      }
      pid = null;
    };

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerActive = true;
      dragging = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      pid = e.pointerId;
    });

    track.addEventListener("pointermove", (e) => {
      if (!pointerActive) return;
      const dx = e.clientX - startX;

      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        pauseAutoInternal();
        try { track.setPointerCapture(pid); } catch (_) {}
        track.classList.add("grabbing");
      }

      track.scrollLeft = startLeft - dx;
    });

    track.addEventListener("pointerup", endPointer);
    track.addEventListener("pointercancel", endPointer);
    track.addEventListener("lostpointercapture", endPointer);

    let scrollRAF = 0;
    track.addEventListener(
      "scroll",
      () => {
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
        scrollRAF = requestAnimationFrame(() => updateProjectsUI());
      },
      { passive: true }
    );

    window.addEventListener("resize", () => updateProjectsUI(), { passive: true });

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

    document.addEventListener("pointerdown", (e) => {
      if (!manualLock) return;

      const insideCard = e.target.closest(".project-card");
      if (insideCard) return;

      const insideControl = e.target.closest(".drawer-btn") || e.target.closest(".dot");
      if (insideControl) return;

      const insideProjects = e.target.closest("#projects");
      if (!insideProjects) {
        unlockSelection();
        return;
      }

      unlockSelection();
    });

    updateProjectsUI();
  }

  // =========================
  // Background animation:
  // WebGL shader (primary) + 2D fallback
  // Generative Art Studio = soft blobs/metaballs
  // =========================
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  function init2DBackground() {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    let rafId = null;
    let running = false;

    let w = 0, h = 0, dpr = 1;

    const palette = [
      { r: 255, g: 107, b: 107 }, // red
      { r: 77, g: 150, b: 255 },  // blue
      { r: 107, g: 203, b: 119 }, // green
    ];

    let blobs = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = clamp(Math.round((w * h) / 240000), 6, 10);
      blobs = Array.from({ length: count }, (_, i) => {
        const c = palette[i % palette.length];
        return {
          x: rand(0, w),
          y: rand(0, h),
          r: rand(Math.min(w, h) * 0.18, Math.min(w, h) * 0.34),
          vx: rand(-0.10, 0.10),
          vy: rand(-0.08, 0.08),
          c,
          a: rand(0.035, 0.060),
        };
      });
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();

    let last = performance.now();

    function frame(now) {
      if (!running) return;

      const dt = clamp(now - last, 10, 40);
      last = now;

      // clear
      ctx.clearRect(0, 0, w, h);

      // gentle base
      ctx.fillStyle = "rgba(10,10,10,1)";
      ctx.fillRect(0, 0, w, h);

      // blobs
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0.0, `rgba(${b.c.r},${b.c.g},${b.c.b},${b.a})`);
        g.addColorStop(0.55, `rgba(${b.c.r},${b.c.g},${b.c.b},${b.a * 0.45})`);
        g.addColorStop(1.0, `rgba(${b.c.r},${b.c.g},${b.c.b},0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      rafId = requestAnimationFrame(frame);
    }

    return {
      start() {
        if (prefersReducedMotion) return;
        if (running) return;
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },
    };
  }

  function initShaderBackground() {
    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }) || null;
    if (!gl) return null;

    const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos,0.0,1.0);} `;

    // Soft metaball blobs shader (subtle, art-first)
    const FRAG = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

      float metaball(vec2 p, vec2 c, float r){
        vec2 d = p - c;
        float dd = dot(d,d);
        return (r*r) / (dd + 1e-4);
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / u_res;
        float asp = u_res.x / u_res.y;
        vec2 p = (uv - 0.5) * vec2(asp, 1.0);

        float t = u_time * 0.18;

        vec2 m = (u_mouse / u_res - 0.5) * vec2(asp, 1.0);
        p += m * 0.06;

        vec2 c1 = vec2(0.45*sin(t*1.10), 0.32*cos(t*0.90));
        vec2 c2 = vec2(0.40*sin(t*0.70+2.2), 0.28*cos(t*0.80+1.4));
        vec2 c3 = vec2(0.42*sin(t*0.90+4.1), 0.34*cos(t*0.60+3.3));
        vec2 c4 = vec2(0.38*sin(t*0.55+1.2), 0.30*cos(t*1.00+5.0));

        float f1 = metaball(p, c1, 0.38);
        float f2 = metaball(p, c2, 0.34);
        float f3 = metaball(p, c3, 0.36);
        float f4 = metaball(p, c4, 0.32);

        float sum = f1 + f2 + f3 + f4 + 1e-5;

        // Palette: #FF6B6B, #4D96FF, #6BCB77
        vec3 red   = vec3(1.0, 0.42, 0.42);
        vec3 blue  = vec3(0.30, 0.59, 1.0);
        vec3 green = vec3(0.42, 0.80, 0.47);

        vec3 blobCol = (blue*f1 + red*f2 + green*f3 + 0.5*(blue+red)*f4) / sum;

        float field = f1 + f2 + f3 + f4;
        field = smoothstep(0.65, 1.35, field); // soft edges

        vec3 base = vec3(0.039); // near #0A0A0A
        base += vec3(0.010,0.010,0.012) * (1.0-uv.y) * 0.6;

        vec3 col = base + blobCol * (field * 0.22); // subtle intensity

        // micro grain
        float g = hash(gl_FragCoord.xy + vec2(t*120.0, -t*90.0));
        col += (g - 0.5) * 0.012;

        // vignette
        float vig = smoothstep(1.10, 0.25, length(p));
        col *= vig;

        gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
      }
    `;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    const verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "a_pos");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const DPR_MAX = 1.5;         // keep smooth on phones
    const FRAME_MS = 1000 / 60;

    let rafId = null;
    let running = false;
    let lastFrame = 0;
    const t0 = performance.now();

    let mxT = window.innerWidth * 0.5;
    let myT = window.innerHeight * 0.55;
    let mx = mxT, my = myT;
    let dpr = 1;

    const setPointer = (clientX, clientY) => {
      mxT = clientX;
      myT = window.innerHeight - clientY;
    };
    window.addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY), { passive: true });

    function resizeGL() {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        gl.viewport(0, 0, w, h);
      }
    }
    window.addEventListener("resize", resizeGL, { passive: true });
    resizeGL();

    function draw(now) {
      if (!running) return;

      if (now - lastFrame < FRAME_MS) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;

      resizeGL();

      // smooth mouse
      const lerp = 0.08;
      mx = mx + (mxT - mx) * lerp;
      my = my + (myT - my) * lerp;

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uMouse, mx * dpr, my * dpr);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(draw);
    }

    return {
      start() {
        if (prefersReducedMotion) return;
        if (running) return;
        running = true;
        lastFrame = 0;
        rafId = requestAnimationFrame(draw);
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },
    };
  }

  let bg = initShaderBackground();
  if (!bg) bg = init2DBackground();

  const startBgIfVisible = () => {
    if (!bg) return;
    if (prefersReducedMotion) return;
    if (document.hidden) return;
    bg.start();
  };
  const stopBg = () => bg && bg.stop();

  // =========================
  // Rover movement:
  // - Desktop: roam around viewport
  // - Mobile: roam around the name inside hero
  // =========================
  function initRover() {
    const el = document.getElementById("flyby");
    if (!el) return null;

    const hero = document.getElementById("intro");
    const name = document.getElementById("name-title");

    let rafId = null;
    let running = false;

    let x = 0, y = 0;
    let vx = 0, vy = 0;
    let targetX = 0, targetY = 0;

    let last = performance.now();
    let cruise = rand(26, 52);

    let nextTargetAt = 0;
    let nextBoostAt = performance.now() + rand(16000, 28000);
    let boostUntil = 0;

    let size = { w: 96, h: 64 };

    const isMobile = () => window.matchMedia("(max-width: 640px)").matches;

    const measure = () => {
      const r = el.getBoundingClientRect();
      size = { w: r.width || 96, h: r.height || 64 };
    };

    const boundsDesktop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const M = Math.max(10, Math.min(24, Math.round(Math.min(w, h) * 0.02)));
      return {
        minX: M,
        maxX: Math.max(M, w - size.w - M),
        minY: M + 6,
        maxY: Math.max(M, h - size.h - M),
      };
    };

    const boundsMobile = () => {
      const hr = hero?.getBoundingClientRect();
      const nr = name?.getBoundingClientRect();
      if (!hr || !nr) return boundsDesktop();

      const heroW = hr.width;
      const heroH = hr.height;

      const nx = nr.left - hr.left;
      const ny = nr.top - hr.top;
      const nw = nr.width;
      const nh = nr.height;

      const padX = Math.max(22, Math.min(40, heroW * 0.08));
      const padTop = 14;
      const padBottom = 62;

      const minX = clamp(nx - padX, 8, heroW - size.w - 8);
      const maxX = clamp(nx + nw + padX - size.w, 8, heroW - size.w - 8);
      const minY = clamp(ny - padTop, 8, heroH - size.h - 8);
      const maxY = clamp(ny + nh + padBottom - size.h, 8, heroH - size.h - 8);

      return { minX, maxX: Math.max(minX, maxX), minY, maxY: Math.max(minY, maxY) };
    };

    const getBounds = () => (isMobile() ? boundsMobile() : boundsDesktop());

    const pickTarget = (force = false) => {
      const b = getBounds();
      targetX = rand(b.minX, b.maxX);
      targetY = rand(b.minY, b.maxY);
      if (force || Math.random() < 0.45) cruise = rand(isMobile() ? 20 : 26, isMobile() ? 44 : 52);
      nextTargetAt = performance.now() + rand(2400, 5200);
    };

    const pickFarTarget = () => {
      const b = getBounds();
      targetX = rand(b.minX, b.maxX);
      targetY = rand(b.minY, b.maxY);
      nextTargetAt = performance.now() + rand(1600, 2600);
    };

    const clampToBounds = () => {
      const b = getBounds();
      if (x < b.minX) { x = b.minX; vx = Math.abs(vx) * 0.7; }
      if (x > b.maxX) { x = b.maxX; vx = -Math.abs(vx) * 0.7; }
      if (y < b.minY) { y = b.minY; vy = Math.abs(vy) * 0.7; }
      if (y > b.maxY) { y = b.maxY; vy = -Math.abs(vy) * 0.7; }
    };

    const tick = (now) => {
      if (!running) return;

      const dt = clamp((now - last) / 1000, 0.01, 0.05);
      last = now;

      if (now > nextTargetAt) pickTarget(false);

      // occasional boost (desktop only; subtle)
      if (!isMobile() && now > nextBoostAt) {
        boostUntil = now + rand(1400, 2200);
        nextBoostAt = now + rand(18000, 32000);
        cruise = rand(78, 120);
        pickFarTarget();
      }

      const boosting = !isMobile() && now < boostUntil;
      el.classList.toggle("boost", boosting);

      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      const desiredVX = (dx / dist) * cruise;
      const desiredVY = (dy / dist) * cruise;

      const steer = boosting ? 0.10 : 0.08;
      vx += (desiredVX - vx) * steer;
      vy += (desiredVY - vy) * steer;

      const maxSpeed = boosting ? 150 : (isMobile() ? 54 : 74);
      const sp = Math.hypot(vx, vy) || 0.0001;
      if (sp > maxSpeed) {
        vx = (vx / sp) * maxSpeed;
        vy = (vy / sp) * maxSpeed;
      }

      x += vx * dt;
      y += vy * dt;

      clampToBounds();

      const dir = vx >= 0 ? 1 : -1;
      const bob = Math.sin(now * 0.003 + 1.7) * (boosting ? 1.8 : 2.6);

      const trail = clamp((sp - 14) / 100, 0, 1);
      el.style.setProperty("--trail", trail.toFixed(3));

      const op = clamp((isMobile() ? 0.46 : 0.38) + trail * 0.12, 0.34, 0.56);
      el.style.opacity = String(op);

      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y + bob)}px, 0) scaleX(${dir})`;

      rafId = requestAnimationFrame(tick);
    };

    let heroVisible = true;
    let heroIO = null;

    const setupHeroObserver = () => {
      if (!hero || !("IntersectionObserver" in window)) return;

      if (heroIO) heroIO.disconnect();

      heroIO = new IntersectionObserver(
        ([entry]) => {
          heroVisible = !!entry?.isIntersecting;
          if (isMobile()) {
            if (heroVisible) start();
            else stop();
          }
        },
        { threshold: 0.08 }
      );

      heroIO.observe(hero);
    };

    const start = () => {
      if (prefersReducedMotion) return;
      if (running) return;
      if (isMobile() && !heroVisible) return;

      running = true;
      measure();

      const b = getBounds();
      x = rand(b.minX, b.maxX);
      y = rand(b.minY, b.maxY);
      vx = rand(-10, 10);
      vy = rand(-8, 8);

      pickTarget(true);
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      el.style.opacity = "0";
    };

    const resize = () => {
      measure();
      clampToBounds();
      pickTarget(true);
    };

    setupHeroObserver();
    return { start, stop, resize };
  }

  const rover = initRover();
  if (rover && !document.hidden) rover.start();
  window.addEventListener("resize", () => rover?.resize(), { passive: true });

  startBgIfVisible();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopBg();
      stopAuto();
      rover?.stop();
    } else {
      startBgIfVisible();
      startAuto();
      rover?.start();
      rover?.resize();
    }
  });
})();
