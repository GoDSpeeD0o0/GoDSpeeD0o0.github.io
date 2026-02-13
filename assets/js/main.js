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

  // Scroll lock manager (modal + cmdk)
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
  // Projects drawer (auto + focus + dots + keys)
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

  // declared early so no TDZ surprises
  let modalOpen = false;

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
    if (modalOpen) return;
    if (autoTimer) return;
    autoTimer = setInterval(() => goToIndex(getActiveIndex() + 1, true), AUTO_SCROLL_MS);
  };

  const pauseAuto = () => {
    stopAuto();
    clearTimeout(resumeTimer);
  };

  const scheduleResume = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => startAuto(), RESUME_AFTER_MS);
  };

  const getCards = () => Array.from(track?.querySelectorAll(".project-card") || []);

  const getTrackPadLeft = () => {
    if (!track) return 0;
    const s = getComputedStyle(track);
    return parseFloat(s.paddingLeft || "0") || 0;
  };

  const scrollToCard = (idx, smooth) => {
    if (!track) return;
    const cards = getCards();
    if (cards.length === 0) return;

    const i = ((idx % cards.length) + cards.length) % cards.length;
    const padLeft = getTrackPadLeft();

    const left = Math.max(0, cards[i].offsetLeft - padLeft);
    track.scrollTo({ left, behavior: smooth ? smoothBehavior : "auto" });
  };

  const getActiveIndex = () => {
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

  const goToIndex = (idx, smooth) => {
    pauseAuto();
    scrollToCard(idx, smooth);
    updateProjectsUI();
    scheduleResume();
  };

  if (track && projectsSection) {
    const cards = getCards();
    if (totalEl) totalEl.textContent = String(cards.length).padStart(2, "0");

    if (dotsEl) {
      dotsEl.innerHTML = "";
      cards.forEach((_, i) => {
        const b = document.createElement("button");
        b.className = "dot";
        b.type = "button";
        b.setAttribute("aria-label", `Go to project ${i + 1}`);
        b.addEventListener("click", () => goToIndex(i, true));
        dotsEl.appendChild(b);
      });
    }

    prev?.addEventListener("click", () => goToIndex(getActiveIndex() - 1, true));
    next?.addEventListener("click", () => goToIndex(getActiveIndex() + 1, true));

    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    track.classList.add("grab");

    // ✅ FIX: don't start pointer-capture dragging when clicking interactive elements
    const isInteractive = (el) => !!el?.closest?.("a, button, input, textarea, select, label");

    track.addEventListener("pointerdown", (e) => {
      // allow anchor clicks, buttons, etc.
      if (isInteractive(e.target)) return;

      // only primary mouse button
      if (e.pointerType === "mouse" && e.button !== 0) return;

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
      updateProjectsUI();
      scheduleResume();
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("lostpointercapture", endDrag);

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

    document.addEventListener("keydown", (e) => {
      if (!projectsInView) return;
      if (cmdkOpen || modalOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToIndex(getActiveIndex() - 1, true);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToIndex(getActiveIndex() + 1, true);
      }
    });

    updateProjectsUI();
  }

  // =========================
  // Project modal (Model Card view)
  // =========================
  const modal = document.getElementById("project-modal");
  const pmClose = document.getElementById("pm-close");
  const pmTitle = document.getElementById("pm-title");
  const pmSub = document.getElementById("pm-sub");
  const pmProblem = document.getElementById("pm-problem");
  const pmApproach = document.getElementById("pm-approach");
  const pmResults = document.getElementById("pm-results");
  const pmStack = document.getElementById("pm-stack");
  const pmLinks = document.getElementById("pm-links");

  const PROJECT_DATA = {
    slackbot: {
      title: "Slack Python QnA Bot",
      meta: "Nov 2025 · AII-projects/slackbot",
      problem:
        "Python support in chat is slow when issues require multi-step debugging and context across messages.",
      approach:
        "Built a Slack bot with a structured QnA flow and automated debugging steps using Python and the Slack API.",
      results: [
        "Automated instant Python technical support in Slack.",
        "Designed workflows to handle multi-step technical queries."
      ],
      stack: ["Python", "Slack API", "Automation"],
      links: [{ label: "Open repo →", url: "https://github.com/AII-projects/slackbot" }]
    },

    "faster-diffusion": {
      title: "Faster Diffusion",
      meta: "Spring 2025 · GoDSpeeD0o0/GenAIProject",
      problem:
        "Diffusion generation was too slow for iterative workflows. The goal was to reduce inference time while preserving output quality.",
      approach:
        "Profiled inference bottlenecks and introduced optimizations in the inference path while validating perceptual quality.",
      results: [
        "Reduced diffusion inference time by 41% while maintaining high-quality results.",
        "Built as a team of three with experiment comparisons and logging."
      ],
      stack: ["Python", "Diffusion", "Optimization", "Deep Learning"],
      links: [{ label: "Open repo →", url: "https://github.com/GoDSpeeD0o0/GenAIProject" }]
    },

    "particle-pollution": {
      title: "Particle Pollution Analysis (Research)",
      meta: "May 2022 · Research-Paper (folder)",
      problem:
        "Model air-quality indicators (PM2.5, emissions) to understand and predict environmental impact trends.",
      approach:
        "Applied ML algorithms to pollutant datasets and evaluated patterns to build a data-driven predictive framework.",
      results: [
        "Modeled PM2.5 and carbon emission behavior to estimate air-quality trends.",
        "Established an analysis framework (team of two)."
      ],
      stack: ["Machine Learning", "Data Analysis", "Research", "Air Quality"],
      links: [
        {
          label: "Open folder →",
          url: "https://github.com/GoDSpeeD0o0/Research-Paper/tree/main/MachineLearningAnalysis_Particle_Pollution"
        }
      ]
    },

    "tweet-sentiment": {
      title: "Tweet Sentiment Analysis",
      meta: "Apr 2024 · GoDSpeeD0o0/TextSentimentAnalysis",
      problem:
        "Track public sentiment in large social datasets with reliable classification.",
      approach:
        "Implemented a transformer-based classifier (ALBERT) and processing pipeline to label large tweet datasets.",
      results: [
        "Categorized large-scale tweet datasets into sentiment classes.",
        "Built an end-to-end NLP workflow for evaluation and iteration."
      ],
      stack: ["NLP", "Transformers", "ALBERT", "Python"],
      links: [{ label: "Open repo →", url: "https://github.com/GoDSpeeD0o0/TextSentimentAnalysis" }]
    }
  };

  const openModal = (key) => {
    const d = PROJECT_DATA[key];
    if (!d || !modal) return;

    modalOpen = true;
    modal.classList.remove("hidden");
    lockScroll();

    if (pmTitle) pmTitle.textContent = d.title;
    if (pmSub) pmSub.textContent = d.meta;

    if (pmProblem) pmProblem.textContent = d.problem;
    if (pmApproach) pmApproach.textContent = d.approach;

    if (pmResults) {
      pmResults.innerHTML = "";
      d.results.forEach((r) => {
        const li = document.createElement("li");
        li.textContent = r;
        pmResults.appendChild(li);
      });
    }

    if (pmStack) {
      pmStack.innerHTML = "";
      d.stack.forEach((s) => {
        const span = document.createElement("span");
        span.className = "pill";
        span.textContent = s;
        pmStack.appendChild(span);
      });
    }

    if (pmLinks) {
      pmLinks.innerHTML = "";
      d.links.forEach((l) => {
        const a = document.createElement("a");
        a.className = "btn-secondary";
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = l.label;
        pmLinks.appendChild(a);
      });

      const closeBtn = document.createElement("button");
      closeBtn.className = "btn-primary";
      closeBtn.type = "button";
      closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", closeModal);
      pmLinks.appendChild(closeBtn);
    }

    stopAuto();
  };

  const closeModal = () => {
    if (!modal) return;
    if (!modalOpen) return;
    modalOpen = false;
    modal.classList.add("hidden");
    unlockScroll();
    if (projectsInView) startAuto();
  };

  pmClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modalOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  });

  // Card click opens modal — but anchor clicks should behave normally
  if (track) {
    const cards = Array.from(track.querySelectorAll(".project-card"));
    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return; // ✅ keep link clicks working
        const key = card.getAttribute("data-project");
        if (key) openModal(key);
      });
    });
  }

  // =========================
  // Cosmic Compute Shader (Theme 3)
  // =========================
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

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
        console.warn(gl.getShaderInfoLog(sh) || "Shader compile failed");
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
        console.warn(gl.getProgramInfoLog(p) || "Program link failed");
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

    let dpr = 1;
    let rafId = null;
    let lastFrame = 0;
    const t0 = performance.now();

    let mxT = window.innerWidth * 0.5;
    let myT = window.innerHeight * 0.55;
    let mx = mxT, my = myT;

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
      if (document.hidden) return;

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

    function start() {
      if (prefersReducedMotion) return;
      if (rafId) return;
      lastFrame = 0;
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      stop();
    }, false);

    return { start, stop };
  }

  const shaderBg = initShaderBackground();
  if (shaderBg && !prefersReducedMotion) shaderBg.start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (shaderBg) shaderBg.stop();
      stopAuto();
    } else {
      if (shaderBg) shaderBg.start();
      startAuto();
    }
  });
})();
