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

  // Reduce motion preference
  const reduceMotionPref = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothBehavior = reduceMotionPref ? "auto" : "smooth";

  // Keep background animated
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
  // Scroll progress (old-style bar)
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

      // scaleX is smoother than width changes
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
      revealTargets.forEach((el) => {
        el.classList.add("reveal", "is-visible");
      });
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

            // Chip cascade (skills only): set delays BEFORE visibility toggle
            if (el.classList.contains("skill-card")) {
              const pills = Array.from(el.querySelectorAll(".pill"));
              pills.forEach((pill, idx) => {
                pill.style.transitionDelay = `${baseDelay + 120 + idx * 45}ms`;
              });
            }

            el.classList.add("is-visible");

            // Card glint sweep (once)
            if (el.classList.contains("glass")) {
              window.setTimeout(() => {
                el.classList.add("glint");
              }, baseDelay + 160);
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
  // Projects drawer
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
      track.scrollTo({ left, behavior: smooth ? smoothBehavior : "auto" });
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

    // Dots
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

    // Arrow buttons lock navigation
    prev?.addEventListener("click", () => lockToIndex(getActiveIndex() - 1, true));
    next?.addEventListener("click", () => lockToIndex(getActiveIndex() + 1, true));

    // Click / double click per card
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

    // Drag-to-scroll
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

    // Scroll updates
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

    // In-view detection
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

    // Click outside unlocks
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
  // Background animation (WebGL primary + 2D fallback)
  // =========================
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  function init2DBackground() {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    let rafId = null;
    let running = false;

    let w = 0, h = 0, dpr = 1;
    let stars = [];
    let nodes = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = clamp(Math.round((w * h) / 9000), 120, 220);
      stars = Array.from({ length: starCount }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(0.6, 1.6),
        a: rand(0.05, 0.20),
        vy: rand(0.02, 0.09),
        vx: rand(-0.03, 0.03),
      }));

      const nodeCount = clamp(Math.round((w * h) / 70000), 14, 22);
      nodes = Array.from({ length: nodeCount }, () => ({
        x: rand(0, w),
        y: rand(0, h * 0.65),
        vx: rand(-0.08, 0.08),
        vy: rand(-0.06, 0.06),
      }));
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();

    let last = performance.now();

    function frame(now) {
      if (!running) return;

      const dt = clamp(now - last, 10, 40);
      last = now;

      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        if (s.y > h + 10) s.y = -10;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      }

      const maxD = Math.min(170, Math.max(120, w * 0.16));
      const maxD2 = maxD * maxD;

      for (const p of nodes) {
        p.x += p.vx * dt * 0.05;
        p.y += p.vy * dt * 0.05;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h * 0.65 + 20;
        if (p.y > h * 0.65 + 20) p.y = -20;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;

          const p = 1 - d2 / maxD2;
          ctx.strokeStyle = `rgba(34,211,238,${0.08 * p})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const p of nodes) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fill();
      }

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
        preserveDrawingBuffer: false,
      }) || null;

    if (!gl) return null;

    const VERT = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const FRAG = `
      precision highp float;

      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        float a = hash(i + vec2(0.0,0.0));
        float b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0));
        float d = hash(i + vec2(1.0,1.0));
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.55;
        for(int i=0;i<3;i++){
          v += a * noise(p);
          p = p*2.02 + 10.0;
          a *= 0.5;
        }
        return v;
      }

      float starLayer(vec2 uv, float scale, float density, float sizeBase, float tw){
        vec2 gv = fract(uv*scale) - 0.5;
        vec2 id = floor(uv*scale);

        float r = hash(id);
        float on = step(1.0 - density, r);

        float size = sizeBase + 0.08 * r;
        float d = length(gv);
        float star = on * smoothstep(size, 0.0, d);

        float t = 0.6 + 0.4 * sin(tw + r * 6.2831);
        return star * t;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / u_res;
        float asp = u_res.x / u_res.y;
        vec2 p = (uv - 0.5) * vec2(asp, 1.0);

        float t = u_time;
        vec2 m = (u_mouse / u_res - 0.5) * vec2(asp, 1.0);
        vec2 par = 0.018 * (m - p);

        vec3 base = vec3(0.045, 0.060, 0.125);
        base += vec3(0.020, 0.026, 0.038) * (1.0 - uv.y) * 0.75;

        float s1 = starLayer(uv + par*0.7, 120.0, 0.018, 0.24, t*1.2);
        float s2 = starLayer(uv + par*1.0, 180.0, 0.011, 0.18, t*1.0 + 2.0);
        float s3 = starLayer(uv + par*1.4, 260.0, 0.008, 0.14, t*0.85 + 4.0);
        float stars = s1 + s2 + s3;

        vec2 q = p + par*1.2;
        q += 0.055 * vec2(
          fbm(q*1.35 + t*0.045),
          fbm(q*1.20 - t*0.040)
        );

        float n1 = fbm(q*1.25 + vec2(0.0, t*0.070));
        float n2 = fbm(q*2.00 + vec2(t*0.050, -t*0.040));

        vec3 cyan = vec3(0.12, 0.88, 0.95);
        vec3 vio  = vec3(0.70, 0.42, 0.98);

        vec3 nebCol = mix(cyan, vio, n2);

        float band = exp(-abs(q.y*1.15 + (n2 - 0.5)*0.75) * 2.1);
        float topMask = smoothstep(0.06, 0.72, uv.y);
        float neb = smoothstep(0.42, 0.95, n1) * band * topMask;

        vec2 c = vec2(0.0, 0.10);
        float r = length(p - c);
        float cycle = 8.4;
        float ph = fract(t / cycle);
        float burst = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.74, ph);
        float rad = 0.10 + ph * 1.10;
        float ring = exp(-abs(r - rad) * 32.0) * burst;

        vec3 col = base;
        col += nebCol * neb * 0.38;
        col += vec3(1.0) * stars * 0.78;
        col += nebCol * stars * 0.05;
        col += nebCol * ring * 0.11;

        float gr = hash(gl_FragCoord.xy + vec2(t*60.0, -t*50.0));
        col += (gr - 0.5) * 0.008;

        float vig = smoothstep(1.20, 0.28, length(p));
        col *= vig;

        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    function makeProgram(vsSrc, fsSrc) {
      const vs = compile(gl.VERTEX_SHADER, vsSrc);
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;

      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);

      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        gl.deleteProgram(p);
        return null;
      }
      return p;
    }

    const program = makeProgram(VERT, FRAG);
    if (!program) return null;

    const verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_pos");
    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    const DPR_MAX = 1.6;
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

      const lerp = 0.08;
      mx = mx + (mxT - mx) * lerp;
      my = my + (myT - my) * lerp;

      gl.useProgram(program);

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
  // Rover movement (roams)
  // =========================
  function initRover() {
    const el = document.getElementById("flyby");
    if (!el) return null;

    let rafId = null;
    let running = false;

    let x = 0, y = 0;
    let vx = 0, vy = 0;
    let targetX = 0, targetY = 0;

    let last = performance.now();
    let cruise = rand(32, 66);

    let nextTargetAt = 0;
    let nextBoostAt = performance.now() + rand(14000, 26000);
    let boostUntil = 0;

    let size = { w: 144, h: 96 };

    const measure = () => {
      const r = el.getBoundingClientRect();
      size = { w: r.width || 144, h: r.height || 96 };
    };

    const bounds = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const M = Math.max(10, Math.min(24, Math.round(Math.min(w, h) * 0.02)));

      const minX = M;
      const maxX = Math.max(M, w - size.w - M);
      const minY = M + 6;
      const maxY = Math.max(M, h - size.h - M);

      return { minX, maxX, minY, maxY, w, h, M };
    };

    const safeZone = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return { x0: w * 0.22, x1: w * 0.78, y0: h * 0.20, y1: h * 0.74 };
    };

    const pickTarget = (force = false) => {
      const { minX, maxX, minY, maxY } = bounds();
      const z = safeZone();

      let tx = 0, ty = 0;
      for (let k = 0; k < 16; k++) {
        tx = rand(minX, maxX);
        ty = rand(minY, maxY);

        const cx = tx + size.w * 0.5;
        const cy = ty + size.h * 0.5;
        const insideSafe = cx > z.x0 && cx < z.x1 && cy > z.y0 && cy < z.y1;
        if (!insideSafe) break;
      }

      targetX = tx;
      targetY = ty;

      if (force || Math.random() < 0.45) cruise = rand(30, 62);
      nextTargetAt = performance.now() + rand(2400, 5200);
    };

    const pickFarTarget = () => {
      const { minX, maxX, minY, maxY, w, h } = bounds();

      let tx = 0, ty = 0;
      for (let k = 0; k < 16; k++) {
        tx = rand(minX, maxX);
        ty = rand(minY, maxY);
        const d = Math.hypot(tx - x, ty - y);
        if (d > Math.min(w, h) * 0.55) break;
      }

      targetX = tx;
      targetY = ty;
      nextTargetAt = performance.now() + rand(1600, 2800);
    };

    const clampToBounds = () => {
      const { minX, maxX, minY, maxY } = bounds();

      if (x < minX) { x = minX; vx = Math.abs(vx) * 0.7; }
      if (x > maxX) { x = maxX; vx = -Math.abs(vx) * 0.7; }
      if (y < minY) { y = minY; vy = Math.abs(vy) * 0.7; }
      if (y > maxY) { y = maxY; vy = -Math.abs(vy) * 0.7; }
    };

    const tick = (now) => {
      if (!running) return;

      const dt = clamp((now - last) / 1000, 0.01, 0.05);
      last = now;

      if (now > nextTargetAt) pickTarget(false);

      if (now > nextBoostAt) {
        boostUntil = now + rand(1800, 3600);
        nextBoostAt = now + rand(16000, 30000);
        cruise = rand(92, 150);
        pickFarTarget();
      }

      const boosting = now < boostUntil;
      el.classList.toggle("boost", boosting);

      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      const desiredVX = (dx / dist) * cruise;
      const desiredVY = (dy / dist) * cruise;

      const steer = boosting ? 0.10 : 0.08;
      vx += (desiredVX - vx) * steer;
      vy += (desiredVY - vy) * steer;

      const maxSpeed = boosting ? 175 : 85;
      const sp = Math.hypot(vx, vy) || 0.0001;
      if (sp > maxSpeed) {
        vx = (vx / sp) * maxSpeed;
        vy = (vy / sp) * maxSpeed;
      }

      x += vx * dt;
      y += vy * dt;

      clampToBounds();

      const dir = vx >= 0 ? 1 : -1;
      const bob = Math.sin(now * 0.003 + 1.7) * (boosting ? 2.6 : 3.8);

      const trail = clamp((sp - 18) / 120, 0, 1);
      el.style.setProperty("--trail", trail.toFixed(3));

      const op = clamp(0.48 + trail * 0.18, 0.48, 0.66);
      el.style.opacity = String(op);

      el.style.transform =
        `translate3d(${Math.round(x)}px, ${Math.round(y + bob)}px, 0) scaleX(${dir})`;

      rafId = requestAnimationFrame(tick);
    };

    return {
      start() {
        if (prefersReducedMotion) return;
        if (running) return;
        running = true;

        measure();
        const { minX, maxX, minY, maxY } = bounds();

        x = rand(minX, Math.min(maxX, minX + (maxX - minX) * 0.20));
        y = rand(minY, Math.min(maxY, minY + (maxY - minY) * 0.22));
        vx = rand(-12, 12);
        vy = rand(-10, 10);

        el.style.opacity = "0.52";
        el.style.setProperty("--trail", "0.25");

        pickTarget(true);
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      },

      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        el.style.opacity = "0";
      },

      resize() {
        measure();
        clampToBounds();
        pickTarget(true);
      },
    };
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
