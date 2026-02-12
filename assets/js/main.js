(() => {
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

  // UI smoothness respects reduce motion; background can be forced on
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

  // ===== Shader background (WebGL) =====
  const canvas = document.getElementById("ai-bg");
  if (!canvas) return;

  function initShaderBackground() {
    // Try WebGL first (works on GitHub Pages, no cost)
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

    if (!gl) {
      // WebGL disabled or unavailable -> keep CSS background
      return null;
    }

    const VERT = `
      attribute vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    // Minimal, smooth “AI aurora” (no clutter)
    const FRAG = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;

      float hash(vec2 p){
        // fast-ish hash
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);

        float a = hash(i + vec2(0.0, 0.0));
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.55;
        // 3 octaves (keeps it smooth + fast)
        for(int i = 0; i < 3; i++){
          v += a * noise(p);
          p = p * 2.02 + 10.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);

        float t = u_time;

        // base: deep but not harsh
        vec3 col = vec3(0.03, 0.05, 0.11);
        col += vec3(0.03, 0.04, 0.07) * (1.0 - uv.y) * 0.55;

        // smooth aurora bands
        float n1 = fbm(p * 1.6 + vec2(0.0, t * 0.10));
        float n2 = fbm(p * 2.4 + vec2(t * 0.06, -t * 0.04));

        float bandCenter = p.y + 0.10 + (n2 - 0.5) * 0.22;
        float band = smoothstep(0.62, 0.95, n1) * smoothstep(0.60, 0.0, abs(bandCenter));

        vec3 cyan = vec3(0.10, 0.88, 0.95);
        vec3 vio  = vec3(0.72, 0.40, 0.98);
        vec3 aurCol = mix(cyan, vio, n2);

        col += aurCol * band * 0.42;

        // soft haze (very low)
        float haze = fbm(p * 0.55 + vec2(t * 0.03, -t * 0.02));
        col += vec3(0.05, 0.06, 0.10) * haze * 0.16;

        // ultra subtle scan (prevents banding, still minimal)
        float scan = 0.004 * sin((uv.y * u_res.y) * 0.18 + t * 1.2);
        col += scan;

        // vignette
        float vig = smoothstep(1.12, 0.25, length(p));
        col *= vig;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compileShader(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(sh) || "Shader compile failed";
        gl.deleteShader(sh);
        console.warn(msg);
        return null;
      }
      return sh;
    }

    function createProgram(vsSrc, fsSrc) {
      const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
      const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const msg = gl.getProgramInfoLog(prog) || "Program link failed";
        gl.deleteProgram(prog);
        console.warn(msg);
        return null;
      }
      return prog;
    }

    const program = createProgram(VERT, FRAG);
    if (!program) return null;

    // Fullscreen triangle (fastest)
    const verts = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3,
    ]);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_pos");
    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");

    // perf: cap DPR slightly (smooth + keeps GPU cool)
    const DPR_MAX = 1.75;

    function resizeGL() {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
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

    let rafId = null;
    const t0 = performance.now();

    function draw(now) {
      if (document.hidden) return;

      resizeGL();

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      rafId = requestAnimationFrame(draw);
    }

    function start() {
      if (prefersReducedMotion) return;
      if (rafId) return;
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // handle context loss gracefully
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      stop();
    }, false);

    return { start, stop };
  }

  const shaderBg = initShaderBackground();
  if (shaderBg && !prefersReducedMotion) shaderBg.start();

  // One visibility handler for BOTH background + projects auto-scroll
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      shaderBg?.stop?.();
      stopAuto();
    } else {
      shaderBg?.start?.();
      startAuto();
    }
  });
})();
