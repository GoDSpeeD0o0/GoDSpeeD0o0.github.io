(() => {
  // =========================
  // Utilities
  // =========================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header height -> CSS var (keeps intro centered)
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

  // Keep background animated (your preference)
  const FORCE_ANIMATION = true;
  const prefersReducedMotion = !FORCE_ANIMATION && reduceMotionPref;

  // Scroll lock manager (cmdk)
  let scrollLocks = 0;
  const lockScroll = () => {
    scrollLocks += 1;
    if (scrollLocks === 1) document.body.style.overflow = "hidden";
  };
  const unlockScroll = () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = "";
  };

  // Toast
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1600);
  };

  // =========================
  // Mobile menu
  // =========================
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

  // =========================
  // Command Palette (Ctrl+K)
  // =========================
  const cmdkBtn = document.getElementById("cmdk-btn");
  const cmdkOverlay = document.getElementById("cmdk-overlay");
  const cmdkInput = document.getElementById("cmdk-input");
  const cmdkList = document.getElementById("cmdk-list");

  let cmdkOpen = false;
  let cmdkIndex = 0;

  const getCmdkItems = () => Array.from(cmdkList?.querySelectorAll(".cmdk-item") || []);
  const setCmdkActive = (idx) => {
    const items = getCmdkItems().filter((b) => !b.classList.contains("hidden"));
    if (items.length === 0) return;
    cmdkIndex = ((idx % items.length) + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle("active", i === cmdkIndex));
    items[cmdkIndex].scrollIntoView({ block: "nearest" });
  };

  const filterCmdk = (q) => {
    const query = (q || "").trim().toLowerCase();
    const all = getCmdkItems();
    all.forEach((btn) => {
      const text = (btn.getAttribute("data-search") || btn.textContent || "").toLowerCase();
      btn.classList.toggle("hidden", query && !text.includes(query));
    });
    setCmdkActive(0);
  };

  const runCmdkAction = (btnEl) => {
    if (!btnEl) return;
    const action = btnEl.getAttribute("data-action");
    const target = btnEl.getAttribute("data-target") || "";
    const value = btnEl.getAttribute("data-value") || "";

    closeCmdk();

    if (action === "goto" && target) {
      document.querySelector(target)?.scrollIntoView({ behavior: smoothBehavior, block: "start" });
    } else if (action === "open" && target) {
      window.open(target, "_blank", "noopener");
    } else if (action === "copy") {
      const text = value || target;
      if (!text) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => toast("Copy failed"));
      } else {
        window.prompt("Copy:", text);
      }
    }
  };

  const openCmdk = () => {
    if (!cmdkOverlay || !cmdkInput || !cmdkList) return;
    if (cmdkOpen) return;
    cmdkOpen = true;
    cmdkOverlay.classList.remove("hidden");
    lockScroll();
    cmdkInput.value = "";
    filterCmdk("");
    setTimeout(() => cmdkInput.focus(), 0);
  };

  const closeCmdk = () => {
    if (!cmdkOverlay) return;
    if (!cmdkOpen) return;
    cmdkOpen = false;
    cmdkOverlay.classList.add("hidden");
    unlockScroll();
  };

  cmdkBtn?.addEventListener("click", openCmdk);
  cmdkOverlay?.addEventListener("click", (e) => {
    if (e.target === cmdkOverlay) closeCmdk();
  });

  cmdkInput?.addEventListener("input", (e) => filterCmdk(e.target.value));

  cmdkList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cmdk-item");
    if (!btn || btn.classList.contains("hidden")) return;
    runCmdkAction(btn);
  });

  document.addEventListener("keydown", (e) => {
    const isK = e.key.toLowerCase() === "k";
    const meta = e.metaKey || e.ctrlKey;

    if (meta && isK) {
      e.preventDefault();
      if (cmdkOpen) closeCmdk();
      else openCmdk();
      return;
    }

    if (!cmdkOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeCmdk();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdkActive(cmdkIndex + 1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdkActive(cmdkIndex - 1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const items = getCmdkItems().filter((b) => !b.classList.contains("hidden"));
      runCmdkAction(items[cmdkIndex]);
    }
  });

  // =========================
  // Projects drawer
  // - single click: lock selection + stop auto
  // - double click: open repo
  // - click elsewhere: unlock selection
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

  // Selection lock state (single click)
  let manualLock = false;
  let selectedIndex = 0;

  // Drag tracking to avoid accidental “click select” after a drag
  let lastDragTime = 0;

  const stopAuto = () => {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    if (!track) return;
    if (!projectsInView) return;
    if (document.hidden) return;
    if (cmdkOpen) return;
    if (manualLock) return;
    if (autoTimer) return;

    autoTimer = setInterval(() => {
      if (manualLock) return;
      const nextIdx = getScrollActiveIndex() + 1;
      scrollToCard(nextIdx, true);
      updateProjectsUI();
    }, AUTO_SCROLL_MS);
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(resumeTimer);
  };

  const scheduleResume = () => {
    if (manualLock) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => startAuto(), RESUME_AFTER_MS);
  };

  const getCards = () => Array.from(track?.querySelectorAll(".project-card") || []);
  const normIndex = (idx) => {
    const cards = getCards();
    if (cards.length === 0) return 0;
    return ((idx % cards.length) + cards.length) % cards.length;
  };

  const getTrackPadLeft = () => {
    if (!track) return 0;
    const s = getComputedStyle(track);
    return parseFloat(s.paddingLeft || "0") || 0;
  };

  const scrollToCard = (idx, smooth) => {
    if (!track) return;
    const cards = getCards();
    if (cards.length === 0) return;

    const i = normIndex(idx);
    const padLeft = getTrackPadLeft();
    const left = Math.max(0, cards[i].offsetLeft - padLeft);

    track.scrollTo({ left, behavior: smooth ? smoothBehavior : "auto" });
  };

  const getScrollActiveIndex = () => {
    const cards = getCards();
    if (!track || cards.length === 0) return 0;

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
    if (!track || cards.length === 0) return;

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

  const lockToIndex = (idx, smooth = true) => {
    if (!track) return;
    manualLock = true;
    selectedIndex = normIndex(idx);
    pauseAuto();
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

  if (track && projectsSection) {
    const cards = getCards();
    if (totalEl) totalEl.textContent = String(cards.length).padStart(2, "0");

    // dots
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

    // arrow buttons = manual lock navigation
    prev?.addEventListener("click", () => lockToIndex(getActiveIndex() - 1, true));
    next?.addEventListener("click", () => lockToIndex(getActiveIndex() + 1, true));

    // click + dblclick behavior on each card
    cards.forEach((card, i) => {
      card.addEventListener("click", () => {
        if (performance.now() - lastDragTime < 240) return;
        lockToIndex(i, true);
      });

      card.addEventListener("dblclick", () => {
        if (performance.now() - lastDragTime < 240) return;
        openRepoForCard(card);
      });

      // keyboard: Enter opens repo
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openRepoForCard(card);
        }
      });
    });

    // drag-to-scroll (captures pointer only after threshold)
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
      // only primary mouse
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
        pauseAuto();
        try { track.setPointerCapture(pid); } catch (_) {}
        track.classList.add("grabbing");
      }

      track.scrollLeft = startLeft - dx;
    });

    track.addEventListener("pointerup", endPointer);
    track.addEventListener("pointercancel", endPointer);
    track.addEventListener("lostpointercapture", endPointer);

    // scroll updates
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

    // in-view detection for auto scroll
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

    // click elsewhere unlocks
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
  // Background Animation (WebGL primary + 2D fallback)
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

    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // minimal, clean
      const starCount = clamp(Math.round((w * h) / 9000), 120, 220);
      stars = Array.from({ length: starCount }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(0.6, 1.6),
        a: rand(0.05, 0.22),
        vy: rand(0.03, 0.10),
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

      // clear
      ctx.clearRect(0, 0, w, h);

      // stars
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

      // subtle AI-network lines (low density)
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

      // nodes
      for (const p of nodes) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        ctx.fill();
      }

      rafId = requestAnimationFrame(frame);
    }

    return {
      type: "2d",
      start() {
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
        vec2 par = 0.020 * (m - p);

        vec3 base = vec3(0.028, 0.040, 0.095);
        base += vec3(0.015, 0.018, 0.028) * (1.0 - uv.y) * 0.75;

        float s1 = starLayer(uv + par*0.7, 120.0, 0.020, 0.24, t*1.4);
        float s2 = starLayer(uv + par*1.0, 180.0, 0.012, 0.18, t*1.1 + 2.0);
        float s3 = starLayer(uv + par*1.4, 260.0, 0.009, 0.14, t*0.9 + 4.0);
        float stars = s1 + s2 + s3;

        vec2 q = p + par*1.2;
        q += 0.06 * vec2(
          fbm(q*1.35 + t*0.05),
          fbm(q*1.20 - t*0.045)
        );

        float n1 = fbm(q*1.35 + vec2(0.0, t*0.08));
        float n2 = fbm(q*2.10 + vec2(t*0.06, -t*0.05));

        vec3 cyan = vec3(0.10, 0.88, 0.95);
        vec3 vio  = vec3(0.72, 0.40, 0.98);

        vec3 nebCol = mix(cyan, vio, n2);
        float band = exp(-abs(q.y*1.20 + (n2 - 0.5)*0.80) * 2.2);
        float topMask = smoothstep(0.05, 0.70, uv.y);
        float neb = smoothstep(0.40, 0.95, n1) * band * topMask;

        float safe = smoothstep(0.95, 0.25, length(p - vec2(0.0, 0.06)));
        neb *= mix(1.0, 0.70, safe);

        vec2 c = vec2(0.0, 0.10);
        float r = length(p - c);
        float cycle = 7.5;
        float ph = fract(t / cycle);
        float burst = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.72, ph);
        float rad = 0.10 + ph * 1.10;
        float ring = exp(-abs(r - rad) * 34.0) * burst;

        float ph2 = fract((t + 2.2) / (cycle * 1.35));
        float burst2 = smoothstep(0.0, 0.06, ph2) * smoothstep(1.0, 0.70, ph2);
        float rad2 = 0.16 + ph2 * 1.25;
        float ring2 = exp(-abs(r - rad2) * 38.0) * burst2;

        vec3 col = base;
        col += nebCol * neb * 0.45;
        col += vec3(1.0) * stars * 0.85;
        col += nebCol * stars * 0.06;
        col += nebCol * (ring * 0.14 + ring2 * 0.10);

        float gr = hash(gl_FragCoord.xy + vec2(t*70.0, -t*55.0));
        col += (gr - 0.5) * 0.010;

        float vig = smoothstep(1.18, 0.28, length(p));
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
    window.addEventListener("touchmove", (e) => {
      const t = e.touches && e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });

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

      // throttle
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
      type: "webgl",
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

  // Primary: WebGL shader. Fallback: 2D star/network.
  let bg = initShaderBackground();
  if (!bg) bg = init2DBackground();

  const startBgIfVisible = () => {
    if (!bg) return;
    if (prefersReducedMotion) return;
    if (document.hidden) return;
    bg.start();
  };

  const stopBg = () => bg && bg.stop();

  // Start ONLY if visible (fixes “opened in background tab” issue)
  startBgIfVisible();

  // visibility handling
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopBg();
      // stop projects auto too
      // (safe even if projects not present)
      const ev = new Event("bg-hidden");
      window.dispatchEvent(ev);
    } else {
      startBgIfVisible();
      const ev = new Event("bg-visible");
      window.dispatchEvent(ev);
    }
  });

  // Hook auto-scroll stop/start into these events without global refs
  window.addEventListener("bg-hidden", () => {
    // auto scroll pause when hidden
    if (typeof stopAuto === "function") stopAuto();
  });
  window.addEventListener("bg-visible", () => {
    // auto scroll resume when visible
    if (typeof startAuto === "function") startAuto();
  });
})();
