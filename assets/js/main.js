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

  // ===== Shader background (WebGL) — Neural Synthwave =====
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

    if (!gl) return null; // WebGL disabled/unavailable -> CSS bg remains

    const VERT = `
      attribute vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    // Creative but controlled:
    // - aurora fog
    // - subtle voronoi neural edges
    // - synth grid below horizon
    // - mouse-reactive energy
    //
    // NOTE: No fwidth/derivatives -> no WebGL1 extension needed (compat + smooth).
    const FRAG = `
      precision highp float;

      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse; // in pixel space, origin bottom-left (like gl_FragCoord)

      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      vec2 hash2(vec2 p){
        vec2 q = vec2(
          dot(p, vec2(127.1, 311.7)),
          dot(p, vec2(269.5, 183.3))
        );
        return fract(sin(q) * 43758.5453123);
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
        for(int i = 0; i < 3; i++){
          v += a * noise(p);
          p = p * 2.02 + 10.0;
          a *= 0.5;
        }
        return v;
      }

      // Returns (F1, F2) distances (nearest, 2nd nearest)
      vec2 voronoi(vec2 x){
        vec2 n = floor(x);
        vec2 f = fract(x);

        float F1 = 8.0;
        float F2 = 8.0;

        for(int j = -1; j <= 1; j++){
          for(int i = -1; i <= 1; i++){
            vec2 g = vec2(float(i), float(j));

            vec2 o = hash2(n + g);
            // Smoothly animate point positions inside cells (creative, not noisy)
            o = 0.5 + 0.5*sin(6.2831*o + u_time*0.35);

            vec2 r = g + o - f;
            float d = dot(r, r);

            if(d < F1){
              F2 = F1;
              F1 = d;
            } else if(d < F2){
              F2 = d;
            }
          }
        }
        return vec2(sqrt(F1), sqrt(F2));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        float asp = u_res.x / u_res.y;

        // scene coords (centered)
        vec2 p = (uv - 0.5) * vec2(asp, 1.0);

        // mouse coords mapped into same space
        vec2 m = (u_mouse / u_res - 0.5) * vec2(asp, 1.0);
        float md = length(p - m);

        float t = u_time;

        // Gentle mouse warp (subtle, premium feel)
        vec2 pw = p + (p - m) * (0.06 * exp(-md * 2.2)) * sin(t * 0.7);

        // Base background (deep but not harsh)
        vec3 col = vec3(0.030, 0.045, 0.110);
        col += vec3(0.020, 0.024, 0.040) * (1.0 - uv.y) * 0.70;

        vec3 cyan = vec3(0.10, 0.88, 0.95);
        vec3 vio  = vec3(0.72, 0.40, 0.98);

        // ===== Aurora fog (top) =====
        vec2 q = pw;
        // smooth warping
        q += 0.10 * vec2(
          fbm(q*1.25 + t*0.05),
          fbm(q*1.25 - t*0.045)
        );

        float n1 = fbm(q*1.70 + vec2(0.0, t*0.12));
        float n2 = fbm(q*2.25 + vec2(t*0.08, -t*0.06));

        // bandy “curtain”
        float band = exp(-abs(q.y*1.35 + (n2 - 0.5)*0.90) * 2.05);
        float topMask = smoothstep(0.05, 0.62, uv.y);

        vec3 aurCol = mix(cyan, vio, n2);
        float aur = smoothstep(0.45, 0.95, n1) * band * topMask;
        col += aurCol * aur * 0.46;

        // ===== Neural edges (voronoi cell borders) =====
        vec2 v = voronoi(q*1.25 + vec2(t*0.08, -t*0.06));
        float edge = smoothstep(0.16, 0.03, (v.y - v.x)); // strong at borders
        col += aurCol * edge * 0.12 * topMask;

        // ===== Contour glints (adds “AI circuitry” feel without clutter) =====
        float c = abs(sin((n1 + n2*0.6 + q.y*0.20)*10.0 + t*0.80));
        float contour = smoothstep(0.12, 0.0, c) * topMask;
        col += vec3(0.90, 0.96, 1.0) * contour * 0.05;

        // ===== Synth grid (bottom) =====
        float horizon = 0.42;
        float below = step(uv.y, horizon);

        float y = max(0.0001, horizon - uv.y);
        float depth = 0.14 / (y + 0.07);

        vec2 g = vec2(pw.x * depth * 1.6, depth + t*0.40);

        float gx = abs(fract(g.x) - 0.5);
        float gy = abs(fract(g.y) - 0.5);

        // Anti-alias approximation without fwidth
        float aa = clamp((1.6 * depth) / u_res.y, 0.0005, 0.012);

        float wx = clamp(0.055 / depth, 0.003, 0.060);
        float wy = clamp(0.055 / depth, 0.003, 0.060);

        float lx = 1.0 - smoothstep(wx, wx + aa*2.0, gx);
        float ly = 1.0 - smoothstep(wy, wy + aa*2.2, gy);

        // major lines every 5
        float mx = abs(fract(g.x / 5.0) - 0.5);
        float my = abs(fract(g.y / 5.0) - 0.5);
        float mlx = 1.0 - smoothstep(wx*1.2, wx*1.2 + aa*2.6, mx);
        float mly = 1.0 - smoothstep(wy*1.2, wy*1.2 + aa*2.6, my);

        float grid = max(max(lx, ly) * 0.75, max(mlx, mly));
        float gfade = smoothstep(horizon, 0.0, uv.y); // 1 at bottom -> 0 at horizon

        vec3 gcol = mix(cyan, vio, 0.5 + 0.5*sin(pw.x*0.9 + t*0.15));
        col += gcol * grid * gfade * below * 0.20;

        // horizon glow
        float hg = exp(-abs(uv.y - horizon) * 85.0);
        col += aurCol * hg * 0.10;

        // mouse energy (subtle highlight)
        col += aurCol * exp(-md * 2.8) * 0.10;

        // subtle CRT-ish scan + grain (tiny, keeps it alive)
        float scan = 0.004 * sin(gl_FragCoord.y * 0.18 + t * 1.2);
        col += scan;

        float gr = hash(gl_FragCoord.xy + vec2(t*60.0, -t*45.0));
        col += (gr - 0.5) * 0.010;

        // vignette
        float vig = smoothstep(1.15, 0.30, length(p));
        col *= vig;

        col = clamp(col, 0.0, 1.0);
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

    // Fullscreen triangle
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
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    // Perf: cap DPR so it stays smooth on retina
    const DPR_MAX = 1.6;
    let dpr = 1;

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

    // Mouse tracking (smoothly lerped so it feels premium)
    let mxT = window.innerWidth * 0.5;
    let myT = window.innerHeight * 0.52; // slightly above center
    let mx = mxT, my = myT;

    const setPointer = (clientX, clientY) => {
      mxT = clientX;
      // convert to bottom-origin for shader
      myT = window.innerHeight - clientY;
    };

    window.addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener("touchmove", (e) => {
      const t = e.touches && e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });

    let rafId = null;
    const t0 = performance.now();

    // Cap to ~60fps (prevents jank on high refresh displays)
    const FRAME_MS = 1000 / 60;
    let lastFrame = 0;

    function draw(now) {
      if (document.hidden) return;

      // frame cap
      if (now - lastFrame < FRAME_MS) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;

      resizeGL();

      // smooth pointer (lerp)
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

  // Visibility handler for BOTH shader + auto-scroll
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
