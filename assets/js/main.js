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

  // Keep background animated
  const FORCE_ANIMATION = true;
  const prefersReducedMotion = !FORCE_ANIMATION && reduceMotionPref;

  // =========================
  // Smooth scrolling + Scrollytelling (Lenis + GSAP ScrollTrigger)
  // =========================
  const hasLenis = typeof window.Lenis === "function";
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  let lenis = null;

  if (hasLenis && !reduceMotionPref) {
    try {
      lenis = new window.Lenis({
        lerp: 0.09,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.35,
      });
      document.documentElement.style.scrollBehavior = "auto";

      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    } catch (_) {
      lenis = null;
    }
  }

  if (hasGSAP) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    if (lenis) {
      lenis.on("scroll", () => window.ScrollTrigger.update());
      window.ScrollTrigger.addEventListener("refresh", () => lenis.resize());
    }

    if (!reduceMotionPref) {
      const hero = document.getElementById("intro");
      const heroInner = hero?.querySelector(".hero-inner");
      const heroKicker = hero?.querySelector(".os-kicker");
      const heroName = document.getElementById("name-title");
      const heroHeadline = hero?.querySelector(".headline");
      const heroEnter = hero?.querySelector(".scroll-indicator");

      if (hero && heroInner && heroName) {
        window.gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "+=120%",
            scrub: true,
            pin: true,
            anticipatePin: 1,
          },
        })
          .to(hero, { "--hero-warp": 0.9, "--hero-warp-y": "80px", "--hero-vig": 0.78, ease: "none" }, 0)
          .to(heroName, { y: -90, scale: 0.84, ease: "none" }, 0)
          .to(heroKicker, { autoAlpha: 0, y: -18, ease: "none" }, 0)
          .to(heroHeadline, { autoAlpha: 0, y: -10, ease: "none" }, 0.05)
          .to(heroEnter, { autoAlpha: 0, y: 18, ease: "none" }, 0.05);
      }
    }
  }

  // Smooth anchor scrolling with Lenis
  const headerOffset = () => (headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      if (!lenis) return;

      e.preventDefault();
      lenis.scrollTo(target, {
        offset: -(headerOffset() + 18),
        duration: 1.05,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    });
  });

  // Mobile menu
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
      } else closeMenu();
      setHeaderHeight();
    });

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  // Scroll progress
  const progressWrap = document.getElementById("scroll-progress");
  const progressBar = document.getElementById("scroll-progress-bar");
  if (progressWrap && progressBar) {
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = clamp(scrollTop / max, 0, 1);

      progressBar.style.transform = `scaleX(${p})`;
      progressWrap.classList.toggle("is-on", p > 0.01);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => update(), { passive: true });
    update();
  }

  // Reveal + glint + skill pill cascade
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
  // Glass focus + reflections (CRYSTAL CLEAR)
  // =========================
  (() => {
    if (reduceMotionPref) return;

    const cards = Array.from(document.querySelectorAll(".glass.card-hover"));
    if (!cards.length) return;

    let active = null;

    const setActive = (el) => {
      if (active === el) return;
      if (active) active.classList.remove("is-focused");
      active = el;
      if (active) {
        document.body.classList.add("focus-mode");
        active.classList.add("is-focused");
      } else {
        document.body.classList.remove("focus-mode");
      }
    };

    const updateVars = (el, clientX, clientY) => {
      const r = el.getBoundingClientRect();
      const px = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1);
      const py = clamp((clientY - r.top) / Math.max(1, r.height), 0, 1);

      el.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);

      // Small tilt applied to overlay only (CSS)
      const tiltY = (px - 0.5) * 6;
      const tiltX = (0.5 - py) * 5;
      el.style.setProperty("--tiltX", `${tiltX.toFixed(2)}deg`);
      el.style.setProperty("--tiltY", `${tiltY.toFixed(2)}deg`);
    };

    cards.forEach((el) => {
      el.addEventListener("mouseenter", (ev) => {
        setActive(el);
        updateVars(el, ev.clientX, ev.clientY);
      });

      el.addEventListener("mousemove", (ev) => {
        if (active !== el) return;
        updateVars(el, ev.clientX, ev.clientY);
      });

      el.addEventListener("mouseleave", (ev) => {
        const next = ev.relatedTarget && ev.relatedTarget.closest?.(".glass.card-hover");
        if (next) return;
        setActive(null);
      });
    });

    document.addEventListener("mousedown", (ev) => {
      if (ev.target.closest(".glass.card-hover")) return;
      setActive(null);
    });
  })();

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
      }) || null;
    if (!gl) return null;

    const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos,0.0,1.0);} `;
    const FRAG = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        vec2 u=f*f*(3.0-2.0*f);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      float fbm(vec2 p){
        float v=0.0, a=0.55;
        for(int i=0;i<3;i++){ v += a*noise(p); p=p*2.02+10.0; a*=0.5; }
        return v;
      }
      float starLayer(vec2 uv,float scale,float density,float sizeBase,float tw){
        vec2 gv=fract(uv*scale)-0.5; vec2 id=floor(uv*scale);
        float r=hash(id); float on=step(1.0-density,r);
        float size=sizeBase+0.08*r;
        float d=length(gv);
        float star=on*smoothstep(size,0.0,d);
        float t=0.6+0.4*sin(tw+r*6.2831);
        return star*t;
      }

      void main(){
        vec2 uv=gl_FragCoord.xy/u_res;
        float asp=u_res.x/u_res.y;
        vec2 p=(uv-0.5)*vec2(asp,1.0);

        float t=u_time;
        vec2 m=(u_mouse/u_res-0.5)*vec2(asp,1.0);
        vec2 par=0.018*(m-p);

        vec3 base=vec3(0.045,0.060,0.125);
        base += vec3(0.020,0.026,0.038)*(1.0-uv.y)*0.75;

        float s1=starLayer(uv+par*0.7,120.0,0.018,0.24,t*1.2);
        float s2=starLayer(uv+par*1.0,180.0,0.011,0.18,t*1.0+2.0);
        float s3=starLayer(uv+par*1.4,260.0,0.008,0.14,t*0.85+4.0);
        float stars=s1+s2+s3;

        vec2 q=p+par*1.2;
        q += 0.055*vec2(fbm(q*1.35+t*0.045), fbm(q*1.20-t*0.040));

        float n1=fbm(q*1.25+vec2(0.0,t*0.070));
        float n2=fbm(q*2.00+vec2(t*0.050,-t*0.040));

        vec3 cyan=vec3(0.12,0.88,0.95);
        vec3 vio =vec3(0.70,0.42,0.98);
        vec3 nebCol=mix(cyan,vio,n2);

        float band=exp(-abs(q.y*1.15+(n2-0.5)*0.75)*2.1);
        float topMask=smoothstep(0.06,0.72,uv.y);
        float neb=smoothstep(0.42,0.95,n1)*band*topMask;

        vec3 col=base;
        col += nebCol*neb*0.38;
        col += vec3(1.0)*stars*0.78;
        col += nebCol*stars*0.05;

        float gr=hash(gl_FragCoord.xy+vec2(t*60.0,-t*50.0));
        col += (gr-0.5)*0.008;

        float vig=smoothstep(1.20,0.28,length(p));
        col *= vig;

        gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
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
  // Rover movement (random smooth roam on desktop)
  // =========================
  function initRover() {
    const el = document.getElementById("flyby");
    if (!el) return null;

    const hero = document.getElementById("intro");
    const name = document.getElementById("name-title");

    let rafId = null;
    let running = false;

    let x = 24, y = 120;
    let x = 24, y = 120;
    let vx = 0, vy = 0;
    let tx = 220, ty = 160;
    let tx = 220, ty = 160;

    let last = performance.now();
    let cruise = rand(70, 96);
    let cruise = rand(70, 96);

    let nextTargetAt = 0;
    let nextBoostAt = performance.now() + rand(12000, 22000);
    let nextBoostAt = performance.now() + rand(12000, 22000);
    let boostUntil = 0;

    let dirState = 1;

    const isMobile = () => window.matchMedia("(max-width: 640px)").matches;

    const getHeroAnchor = () => {
      const r = (name || hero).getBoundingClientRect();
      return { baseX: r.left + r.width * 0.5, baseY: r.top + r.height * 0.35 };
    };

    const pickTargetDesktop = () => {
      const pad = 24;
      tx = rand(pad, window.innerWidth - pad - 120);
      ty = rand(90, window.innerHeight - pad - 120);
      nextTargetAt = performance.now() + rand(1800, 4200);
      cruise = rand(72, 98);
    const pickTargetDesktop = () => {
      const pad = 24;
      tx = rand(pad, window.innerWidth - pad - 120);
      ty = rand(90, window.innerHeight - pad - 120);
      nextTargetAt = performance.now() + rand(1800, 4200);
      cruise = rand(72, 98);
    };

    const pickTargetMobile = () => {
      const hr = hero.getBoundingClientRect();
      const { baseX, baseY } = getHeroAnchor();
      const a = rand(0, Math.PI * 2);
      const rx = 64;
      const ry = 26;
      tx = (baseX - hr.left) + Math.cos(a) * rx;
      ty = (baseY - hr.top) + Math.sin(a) * ry;
      nextTargetAt = performance.now() + rand(1500, 3200);
      cruise = rand(34, 52);
    };

    const clampDesktop = () => {
      const pad = 24;
      x = clamp(x, pad, window.innerWidth - pad - 120);
      y = clamp(y, 70, window.innerHeight - pad - 120);
    const clampDesktop = () => {
      const pad = 24;
      x = clamp(x, pad, window.innerWidth - pad - 120);
      y = clamp(y, 70, window.innerHeight - pad - 120);
    };

    const clampMobile = () => {
      const hr = hero.getBoundingClientRect();
      x = clamp(x, 8, hr.width - 90);
      y = clamp(y, 8, hr.height - 70);
    };

    const tick = (now) => {
      if (!running) return;

      const dt = clamp((now - last) / 1000, 0.01, 0.05);
      last = now;

      if (now > nextTargetAt) (isMobile() ? pickTargetMobile() : pickTargetDesktop());

      const boosting = !isMobile() && now < boostUntil;
      if (!isMobile() && now > nextBoostAt) {
        boostUntil = now + rand(900, 1600);
        nextBoostAt = now + rand(14000, 26000);
      }
      el.classList.toggle("boost", boosting);

      const speed = boosting ? cruise * 1.6 : cruise;

      const dx = tx - x;
      const dy = ty - y;
      const speed = boosting ? cruise * 1.6 : cruise;

      const dx = tx - x;
      const dy = ty - y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      const arrive = dist < 18 ? 0.80 : 1.0;

      const desiredVX = (dx / dist) * speed;
      const desiredVY = (dy / dist) * speed;

      const steer = boosting ? 0.12 : 0.085;
      const desiredVX = (dx / dist) * speed;
      const desiredVY = (dy / dist) * speed;

      const steer = boosting ? 0.12 : 0.085;
      vx += (desiredVX - vx) * steer;
      vy += (desiredVY - vy) * steer;

      vx *= arrive;
      vy *= arrive;
      vx *= arrive;
      vy *= arrive;

      x += vx * dt;
      y += vy * dt;

      isMobile() ? clampMobile() : clampDesktop();

      if (Math.abs(vx) > 6) dirState = vx >= 0 ? 1 : -1;

      const bob = Math.sin(now * 0.003 + 1.7) * (boosting ? 2.0 : 2.6);

      const sp = Math.hypot(vx, vy);
      const trail = clamp((sp - 10) / 120, 0, 1);
      const bob = Math.sin(now * 0.003 + 1.7) * (boosting ? 2.0 : 2.6);

      const sp = Math.hypot(vx, vy);
      const trail = clamp((sp - 10) / 120, 0, 1);
      el.style.setProperty("--trail", trail.toFixed(3));

      const op = clamp((isMobile() ? 0.58 : 0.50) + trail * 0.12, 0.48, 0.70);
      const op = clamp((isMobile() ? 0.58 : 0.50) + trail * 0.12, 0.48, 0.70);
      el.style.opacity = String(op);

      el.style.transform = `translate3d(${x.toFixed(2)}px, ${(y + bob).toFixed(2)}px, 0) scaleX(${dirState})`;

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
      last = performance.now();
      vx = rand(-12, 12);
      vy = rand(-10, 10);

      if (isMobile()) {
        x = rand(14, 90);
        y = rand(18, 80);
        pickTargetMobile();
      } else {
        x = rand(24, window.innerWidth - 160);
        y = rand(120, window.innerHeight - 160);
        pickTargetDesktop();
      }

      last = performance.now();
      vx = rand(-12, 12);
      vy = rand(-10, 10);

      if (isMobile()) {
        x = rand(14, 90);
        y = rand(18, 80);
        pickTargetMobile();
      } else {
        x = rand(24, window.innerWidth - 160);
        y = rand(120, window.innerHeight - 160);
        pickTargetDesktop();
      }

      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      el.style.opacity = "0";
    };

    const resize = () => {
      if (!running) return;
      isMobile() ? clampMobile() : clampDesktop();
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