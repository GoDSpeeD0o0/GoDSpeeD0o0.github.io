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

  // Keep background animated unless user explicitly prefers reduced motion.
  const prefersReducedMotion = reduceMotionPref;

  // GSAP (optional)
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (hasGSAP) {
    try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (_) {}
  }

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
  // Scroll reveal + glint + chip cascade (kept light)
  // =========================
  const revealTargets = Array.from(document.querySelectorAll("main .os-header, main .glass"));

  if (revealTargets.length) {
    if (prefersReducedMotion) {
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
  // Neural Atlas: active section tracking (for rover + constellation clustering)
  // =========================
  const SECTION_THEME = {
    intro:     { rover: ["rgba(255,255,255,0.10)", "rgba(34,211,238,0.08)"], atlas: ["rgba(34,211,238,0.28)", "rgba(168,85,247,0.18)"] },
    telemetry: { rover: ["rgba(34,211,238,0.12)", "rgba(168,85,247,0.09)"], atlas: ["rgba(34,211,238,0.35)", "rgba(168,85,247,0.20)"] },
    skills:    { rover: ["rgba(34,211,238,0.14)", "rgba(168,85,247,0.12)"], atlas: ["rgba(34,211,238,0.40)", "rgba(168,85,247,0.26)"] },
    education: { rover: ["rgba(255,255,255,0.10)", "rgba(34,211,238,0.06)"], atlas: ["rgba(255,255,255,0.10)", "rgba(34,211,238,0.18)"] },
    experience:{ rover: ["rgba(255,255,255,0.10)", "rgba(34,211,238,0.10)"], atlas: ["rgba(34,211,238,0.30)", "rgba(255,255,255,0.10)"] },
    projects:  { rover: ["rgba(168,85,247,0.16)", "rgba(34,211,238,0.10)"], atlas: ["rgba(168,85,247,0.34)", "rgba(34,211,238,0.20)"] },
    contact:   { rover: ["rgba(34,211,238,0.12)", "rgba(168,85,247,0.10)"], atlas: ["rgba(34,211,238,0.28)", "rgba(168,85,247,0.18)"] },
  };

  const atlasSections = Array.from(document.querySelectorAll("section[data-atlas]"));
  let activeAtlasKey = "intro";

  const applyTheme = (key) => {
    const t = SECTION_THEME[key] || SECTION_THEME.intro;
    document.documentElement.style.setProperty("--rover-c1", t.rover[0]);
    document.documentElement.style.setProperty("--rover-c2", t.rover[1]);
    document.documentElement.style.setProperty("--atlas-c1", t.atlas[0]);
    document.documentElement.style.setProperty("--atlas-c2", t.atlas[1]);
  };

  // =========================
  // Background animation (WebGL primary + 2D fallback)
  // =========================
  const canvas = document.getElementById("ai-bg");
  const atlasCanvas = document.getElementById("atlas-bg");

  // --- Base shader background (kept from your version) ---
  function initShaderBackground() {
    if (!canvas) return null;

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

  const shaderBg = initShaderBackground();

  // --- Neural Atlas overlay: constellation that clusters around active section header ---
  function initAtlasOverlay() {
    if (!atlasCanvas) return null;
    const ctx = atlasCanvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    let rafId = null;
    let running = false;

    let w = 0, h = 0, dpr = 1;

    const N = 28;
    let nodes = [];
    let center = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 };
    let centerT = { ...center };

    let currentAnchorEl = null;

    const cssVar = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };

    const parseRGBA = (s, fallback = [255,255,255,0.2]) => {
      // expects "rgba(r,g,b,a)"
      const m = s.match(/rgba?\(([^)]+)\)/i);
      if (!m) return fallback;
      const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
      if (parts.length >= 3) {
        const a = parts.length === 4 ? parts[3] : 1;
        return [parts[0], parts[1], parts[2], a];
      }
      return fallback;
    };

    const rgbaStr = (arr, mulA = 1) => `rgba(${arr[0]},${arr[1]},${arr[2]},${clamp(arr[3] * mulA, 0, 1)})`;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      atlasCanvas.width = Math.floor(w * dpr);
      atlasCanvas.height = Math.floor(h * dpr);
      atlasCanvas.style.width = "100vw";
      atlasCanvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // regenerate or re-center a bit
      if (nodes.length === 0) {
        nodes = Array.from({ length: N }, (_, i) => ({
          x: center.x + rand(-120, 120),
          y: center.y + rand(-90, 90),
          ox: rand(-140, 140),
          oy: rand(-100, 100),
          tox: 0,
          toy: 0,
          r: rand(1.1, 2.4),
          p: rand(0, Math.PI * 2),
          s: rand(0.25, 0.7),
        }));
      }
    }
    window.addEventListener("resize", resize, { passive: true });
    resize();

    function setAnchorElement(el) {
      currentAnchorEl = el;
      // refresh target offsets so constellation "re-maps" per section
      nodes.forEach((n) => {
        n.tox = rand(-150, 150);
        n.toy = rand(-110, 110);
      });
    }

    function updateTargetFromAnchor() {
      if (!currentAnchorEl) return;

      const r = currentAnchorEl.getBoundingClientRect();
      // anchor slightly above the section title for “map orbit”
      const x = r.left + r.width * 0.5;
      const y = r.top + Math.min(28, r.height * 0.4);

      centerT.x = clamp(x, 60, w - 60);
      centerT.y = clamp(y, 60, h - 80);
    }

    let last = performance.now();

    function frame(now) {
      if (!running) return;

      const dt = clamp((now - last) / 1000, 0.01, 0.05);
      last = now;

      updateTargetFromAnchor();

      // lerp center
      center.x += (centerT.x - center.x) * 0.08;
      center.y += (centerT.y - center.y) * 0.08;

      // colors from CSS vars (changes with active section)
      const c1 = parseRGBA(cssVar("--atlas-c1", "rgba(34,211,238,0.35)"), [34,211,238,0.35]);
      const c2 = parseRGBA(cssVar("--atlas-c2", "rgba(168,85,247,0.22)"), [168,85,247,0.22]);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // animate node offsets toward their per-section target offsets
      for (const n of nodes) {
        n.ox += (n.tox - n.ox) * 0.05;
        n.oy += (n.toy - n.oy) * 0.05;

        // subtle orbit + drift around center
        n.p += dt * (0.55 + n.s);
        const wobX = Math.cos(n.p) * 9;
        const wobY = Math.sin(n.p * 1.2) * 6;

        const tx = center.x + n.ox * 0.55 + wobX;
        const ty = center.y + n.oy * 0.55 + wobY;

        n.x += (tx - n.x) * 0.08;
        n.y += (ty - n.y) * 0.08;
      }

      // lines
      const maxD = 165;
      const maxD2 = maxD * maxD;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;

          const p = 1 - d2 / maxD2;
          ctx.lineWidth = 1;
          ctx.strokeStyle = (j % 2 === 0)
            ? rgbaStr(c1, 0.22 * p)
            : rgbaStr(c2, 0.18 * p);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const glow = i % 3 === 0 ? c2 : c1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = rgbaStr(glow, 0.42);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 2.2, 0, Math.PI * 2);
        ctx.fillStyle = rgbaStr(glow, 0.10);
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
      setAnchorElement,
    };
  }

  const atlas = initAtlasOverlay();

  // =========================
  // Rover: Section Companion + project inspection hover
  // =========================
  function initRover() {
    const el = document.getElementById("flyby");
    if (!el) return null;

    const hero = document.getElementById("intro");
    const name = document.getElementById("name-title");

    let rafId = null;
    let running = false;

    let x = 24, y = 120;
    let xT = x, yT = y;

    let dir = 1;

    // Section anchor + inspection target
    let anchorEl = null;
    let inspectEl = null;

    // scan pulse
    let scanUntil = 0;

    // orbit phase
    let t = rand(0, 1000);

    const isMobile = () => window.matchMedia("(max-width: 640px)").matches;

    const getCenterOfEl = (domEl) => {
      if (!domEl) return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 };
      const r = domEl.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
    };

    const getThumbCenter = (cardEl) => {
      const thumb = cardEl?.querySelector?.(".project-thumb");
      return getCenterOfEl(thumb || cardEl);
    };

    const setAnchorElement = (domEl) => {
      anchorEl = domEl;
    };

    const inspectCard = (cardEl) => {
      inspectEl = cardEl;
    };

    const clearInspect = () => {
      inspectEl = null;
    };

    const scan = () => {
      if (prefersReducedMotion) return;
      scanUntil = performance.now() + 900;
      el.classList.add("scan");
      window.setTimeout(() => el.classList.remove("scan"), 920);
    };

    function stepDesktop(now) {
      const target = inspectEl ? getThumbCenter(inspectEl) : getCenterOfEl(anchorEl);

      // patrol orbit around the target (small and clean)
      const baseX = clamp(target.x, 80, window.innerWidth - 80);
      const baseY = clamp(target.y, 90, window.innerHeight - 90);

      const rX = inspectEl ? 22 : 28;
      const rY = inspectEl ? 12 : 16;

      t += 0.016;
      const patrolX = Math.cos(t * 2.2) * rX;
      const patrolY = Math.sin(t * 1.9) * rY;

      // scan pass (small sweep)
      let sweep = 0;
      if (now < scanUntil) {
        const p = 1 - (scanUntil - now) / 900; // 0..1
        sweep = (p * 2 - 1) * 42;
      }

      xT = baseX + patrolX + sweep - el.getBoundingClientRect().width * 0.5;
      yT = baseY + patrolY - el.getBoundingClientRect().height * 0.5;

      // smooth follow
      x += (xT - x) * 0.085;
      y += (yT - y) * 0.085;

      // direction based on motion
      const vx = xT - x;
      dir = vx >= 0 ? 1 : -1;

      // trail intensity based on speed
      const sp = Math.hypot(vx, yT - y);
      const trail = clamp(sp / 140, 0.06, 0.24);
      el.style.setProperty("--trail", trail.toFixed(3));
      el.style.opacity = String(clamp(0.46 + trail * 0.55, 0.42, 0.62));

      const bob = Math.sin(now * 0.003) * 2.2;
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y + bob)}px, 0) scaleX(${dir})`;
    }

    function stepMobile(now) {
      // orbit around the name baseline inside the hero
      if (!hero || !name) return;

      const hr = hero.getBoundingClientRect();
      const nr = name.getBoundingClientRect();

      const size = el.getBoundingClientRect();
      const cx = (nr.left - hr.left) + nr.width * 0.5;
      const cy = (nr.top - hr.top) + nr.height * 0.78;

      const rx = Math.min(84, Math.max(54, nr.width * 0.55));
      const ry = 18;

      t += 0.028;
      const ox = Math.cos(t) * rx;
      const oy = Math.sin(t * 1.3) * ry;

      const px = cx + ox - size.width * 0.5;
      const py = cy + oy - size.height * 0.5;

      el.style.opacity = "0.44";
      el.style.setProperty("--trail", "0.10");
      el.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0)`;
    }

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

    const tick = (now) => {
      if (!running) return;

      if (isMobile()) stepMobile(now);
      else stepDesktop(now);

      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (prefersReducedMotion) return;
      if (running) return;
      if (isMobile() && !heroVisible) return;

      running = true;
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      el.style.opacity = "0";
    };

    const resize = () => {
      // no-op but kept for compatibility
    };

    setupHeroObserver();

    return { start, stop, resize, setAnchorElement, inspectCard, clearInspect, scan };
  }

  const rover = initRover();

  // =========================
  // Active section switching (ScrollTrigger preferred, IO fallback)
  // =========================
  function getSectionHeaderEl(sectionEl) {
    if (!sectionEl) return null;
    // prefer os-header (map coordinates block)
    return sectionEl.querySelector(".os-header") || sectionEl.querySelector("h2") || sectionEl;
  }

  function setActiveSectionByKey(key, sectionEl) {
    if (!key) return;
    if (key === activeAtlasKey) return;

    activeAtlasKey = key;
    applyTheme(key);

    const header = getSectionHeaderEl(sectionEl);

    rover?.setAnchorElement(header);
    atlas?.setAnchorElement(header);
    rover?.scan();
  }

  // initial
  applyTheme(activeAtlasKey);
  rover?.start();
  shaderBg?.start();
  atlas?.start();

  if (hasGSAP && !prefersReducedMotion) {
    // Hero scrollytelling: pin + “boot -> telemetry” morph
    const intro = document.getElementById("intro");
    const name = document.getElementById("name-title");
    const headline = intro?.querySelector(".headline");
    const kicker = intro?.querySelector(".os-kicker");
    const enter = intro?.querySelector(".scroll-indicator");

    if (intro && name) {
      const tl = window.gsap.timeline({
        scrollTrigger: {
          trigger: intro,
          start: "top top",
          end: "+=80%",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to(name, { scale: 0.78, y: -30, ease: "none" }, 0);
      if (headline) tl.to(headline, { opacity: 0.12, y: -14, ease: "none" }, 0);
      if (kicker) tl.to(kicker, { opacity: 0.0, y: -10, ease: "none" }, 0);
      if (enter) tl.to(enter, { opacity: 0, y: 10, ease: "none" }, 0.08);
    }

    // Section triggers for theme switching (smooth on enter/back)
    atlasSections.forEach((sec) => {
      const key = sec.getAttribute("data-atlas") || "intro";
      window.ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: () => setActiveSectionByKey(key, sec),
        onEnterBack: () => setActiveSectionByKey(key, sec),
      });
    });
  } else {
    // IO fallback
    const io = new IntersectionObserver(
      (entries) => {
        // pick the most visible
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const sec = visible.target;
        const key = sec.getAttribute("data-atlas") || "intro";
        setActiveSectionByKey(key, sec);
      },
      { threshold: [0.18, 0.28, 0.4, 0.55] }
    );
    atlasSections.forEach((s) => io.observe(s));
  }

  // =========================
  // Projects drawer (Infinite, 5s autoplay, pause/resume)
  // =========================
  const projectsSection = document.getElementById("projects");
  const track = document.getElementById("projects-track");
  const prev = document.getElementById("projects-prev");
  const next = document.getElementById("projects-next");
  const dotsEl = document.getElementById("projects-dots");
  const currentEl = document.getElementById("projects-current");
  const totalEl = document.getElementById("projects-total");

  const AUTO_SCROLL_MS = 5000;
  const RESUME_AFTER_MS = 2600;

  let autoTimer = null;
  let resumeTimer = null;
  let projectsInView = false;

  let manualLock = false;
  let selectedLogical = 0;
  let lastDragTime = 0;

  let setWidth = 0;
  let baseCount = 0;

  let startAuto = () => {};
  let stopAuto = () => {};

  if (track && projectsSection) {
    // tag base cards with logical indices
    const baseCards = Array.from(track.querySelectorAll(".project-card"));
    baseCount = baseCards.length;

    baseCards.forEach((c, i) => { c.dataset.idx = String(i); });

    // clone to create: [base][clone][clone]
    const frag = document.createDocumentFragment();
    const makeClone = (el) => {
      const c = el.cloneNode(true);
      c.dataset.idx = el.dataset.idx;
      return c;
    };
    baseCards.forEach((c) => frag.appendChild(makeClone(c)));
    baseCards.forEach((c) => frag.appendChild(makeClone(c)));
    track.appendChild(frag);

    const getAllCards = () => Array.from(track.querySelectorAll(".project-card"));

    const getTrackPadLeft = () => {
      const s = getComputedStyle(track);
      return parseFloat(s.paddingLeft || "0") || 0;
    };

    const computeSetWidth = () => {
      const cards = getAllCards();
      if (cards.length < baseCount * 2) return 0;
      // distance between set0 and set1 start
      return cards[baseCount].offsetLeft - cards[0].offsetLeft;
    };

    const scrollToPhysical = (physicalIndex, smooth) => {
      const cards = getAllCards();
      if (cards.length === 0) return;

      const i = clamp(physicalIndex, 0, cards.length - 1);
      const padLeft = getTrackPadLeft();
      const left = Math.max(0, cards[i].offsetLeft - padLeft);

      track.scrollTo({
        left,
        behavior: smooth ? "smooth" : "auto",
      });
    };

    const scrollToLogical = (logicalIndex, smooth) => {
      const idx = ((logicalIndex % baseCount) + baseCount) % baseCount;
      // always target middle set for stability
      scrollToPhysical(baseCount + idx, smooth);
    };

    const maybeTeleport = () => {
      if (!setWidth) return;
      const left = track.scrollLeft;

      // Keep scroll near the middle set
      if (left < setWidth * 0.35) track.scrollLeft = left + setWidth;
      else if (left > setWidth * 1.65) track.scrollLeft = left - setWidth;
    };

    const getScrollActivePhysicalIndex = () => {
      const cards = getAllCards();
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

    const getActiveLogical = () => {
      if (manualLock) return ((selectedLogical % baseCount) + baseCount) % baseCount;

      const cards = getAllCards();
      const pIdx = getScrollActivePhysicalIndex();
      const el = cards[pIdx];
      const logical = parseInt(el?.dataset?.idx || "0", 10);
      return ((logical % baseCount) + baseCount) % baseCount;
    };

    const updateProjectsUI = () => {
      maybeTeleport();

      const cards = getAllCards();
      if (cards.length === 0) return;

      const activeLogical = getActiveLogical();

      // dim all, highlight the nearest physical with that logical index (prefer currently centered)
      const activePhysical = getScrollActivePhysicalIndex();

      cards.forEach((c, i) => {
        const logical = parseInt(c.dataset.idx || "0", 10);
        const isLogicalMatch = logical === activeLogical;

        // pick the physical card closest to center among matches
        let isActive = false;
        if (isLogicalMatch) {
          // if it's the closest match to center, mark active
          // (simple: make only the centered physical active)
          isActive = (i === activePhysical);
        }

        c.classList.toggle("is-active", isActive);
        c.classList.toggle("is-dim", !isActive);
      });

      const dots = Array.from(dotsEl?.querySelectorAll(".dot") || []);
      dots.forEach((d, i) => d.classList.toggle("active", i === activeLogical));

      if (currentEl) currentEl.textContent = String(activeLogical + 1).padStart(2, "0");
      if (totalEl) totalEl.textContent = String(baseCount).padStart(2, "0");
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

        const activePhysical = getScrollActivePhysicalIndex();
        // cinematic easing: use smooth scroll (browser), but we also tune CSS transforms
        scrollToPhysical(activePhysical + 1, true);
        updateProjectsUI();
      }, AUTO_SCROLL_MS);
    };

    const scheduleResume = () => {
      if (manualLock) return;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => startAuto(), RESUME_AFTER_MS);
    };

    const lockToLogical = (logicalIndex, smooth = true) => {
      manualLock = true;
      selectedLogical = ((logicalIndex % baseCount) + baseCount) % baseCount;
      pauseAutoInternal();
      scrollToLogical(selectedLogical, smooth);
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

    // Build dots for logical set
    if (dotsEl) {
      dotsEl.innerHTML = "";
      for (let i = 0; i < baseCount; i++) {
        const b = document.createElement("button");
        b.className = "dot";
        b.type = "button";
        b.setAttribute("aria-label", `Go to project ${i + 1}`);
        b.addEventListener("click", () => lockToLogical(i, true));
        dotsEl.appendChild(b);
      }
    }

    // Bind events (all cards including clones)
    const bindCard = (card) => {
      const logical = parseInt(card.dataset.idx || "0", 10);

      card.addEventListener("click", () => {
        if (performance.now() - lastDragTime < 240) return;
        lockToLogical(logical, true);
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

      // rover inspect on hover (desktop only)
      card.addEventListener("mouseenter", () => {
        if (window.matchMedia("(hover: hover)").matches) rover?.inspectCard(card);
      });
      card.addEventListener("mouseleave", () => rover?.clearInspect());
    };

    getAllCards().forEach(bindCard);

    // Drawer buttons
    prev?.addEventListener("click", () => lockToLogical(getActiveLogical() - 1, true));
    next?.addEventListener("click", () => lockToLogical(getActiveLogical() + 1, true));

    // Mouse drag-to-scroll (desktop only, keeps touch native)
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
      // Only mouse drag; touch uses native scroll
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;

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

    // Scroll updates + teleport
    let scrollRAF = 0;
    track.addEventListener(
      "scroll",
      () => {
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
        scrollRAF = requestAnimationFrame(() => updateProjectsUI());
      },
      { passive: true }
    );

    // Click outside to unpin (inside projects but outside card)
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

    // On view: start/stop autoplay
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

    // Resize: recompute setWidth and recenter
    const onResize = () => {
      setWidth = computeSetWidth();
      // recenter to middle set
      scrollToLogical(getActiveLogical(), false);
      updateProjectsUI();
    };
    window.addEventListener("resize", onResize, { passive: true });

    // compute setWidth + start in middle set
    setWidth = computeSetWidth();
    if (totalEl) totalEl.textContent = String(baseCount).padStart(2, "0");
    scrollToLogical(0, false);
    updateProjectsUI();
    startAuto();
  }

  // =========================
  // Ensure initial section anchors for rover/atlas
  // =========================
  const initialSection = document.querySelector("section[data-atlas='telemetry']") || document.querySelector("#signals");
  if (initialSection) {
    // seed anchor so atlas isn't “floating” randomly
    setActiveSectionByKey("intro", document.getElementById("intro"));
    rover?.setAnchorElement(getSectionHeaderEl(initialSection));
    atlas?.setAnchorElement(getSectionHeaderEl(initialSection));
  }

  // =========================
  // Visibility handling
  // =========================
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      shaderBg?.stop();
      atlas?.stop();
      rover?.stop();
      stopAuto?.();
    } else {
      shaderBg?.start();
      atlas?.start();
      rover?.start();
      startAuto?.();
    }
  });
})();