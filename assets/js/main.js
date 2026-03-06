(() => {
  // =========================
  // Page Transition Logic
  // =========================
  const bootScreen = document.getElementById("boot-screen");
  const entryOverlay = document.getElementById("page-entry-overlay");

  if (bootScreen) {
    // HOMEPAGE: Full SVG boot sequence (CSS-driven, 2.6s)
    if (sessionStorage.getItem('boot_played')) {
      // Skip full boot sequence, just fade out the black screen smoothly
      bootScreen.innerHTML = ''; // Hide the SVG tracer
      bootScreen.style.transition = 'opacity 0.7s ease-out';
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bootScreen.style.opacity = '0';
          setTimeout(() => bootScreen.remove(), 700);
        });
      });
    } else {
      // Play full sequence
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        bootScreen.remove();
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        sessionStorage.setItem('boot_played', 'true');
      }, 2550);
    }
  } else if (entryOverlay) {
    // SUB-PAGES: Smooth Fade-in from dark overlay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entryOverlay.style.opacity = '0';
        setTimeout(() => entryOverlay.remove(), 700);
      });
    });
  }

  // =========================
  // Iris Portal Exit Animation
  // =========================
  const localLinks = document.querySelectorAll('a[href$=".html"], a[href^="/"], a[href="index.html"]');
  localLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Don't intercept target="_blank", anchors within page, or modifier keys
      if (link.target === '_blank' || link.getAttribute('href').startsWith('#') || e.ctrlKey || e.metaKey || e.shiftKey) return;
      
      e.preventDefault();
      const targetUrl = link.href;
      
      // Check if we are already transitioning
      if (document.getElementById('iris-overlay')) return;
      
      // Create iris overlay matching the background color
      const overlay = document.createElement('div');
      overlay.id = 'iris-overlay';
      overlay.className = 'fixed inset-0 z-[9999] pointer-events-none tracking-tight';
      overlay.style.background = '#071023';
      
      // Start as a tiny circle exactly at the click coordinates
      overlay.style.clipPath = `circle(0px at ${e.clientX}px ${e.clientY}px)`;
      // Smooth easing that resembles an iris snapping open
      overlay.style.transition = 'clip-path 0.55s cubic-bezier(0.7, 0, 0.2, 1)';
      
      document.body.appendChild(overlay);
      
      // Calculate max distance to completely cover screen from click point
      const maxDist = Math.hypot(
        Math.max(e.clientX, window.innerWidth - e.clientX),
        Math.max(e.clientY, window.innerHeight - e.clientY)
      );
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.clipPath = `circle(${maxDist + 50}px at ${e.clientX}px ${e.clientY}px)`;
        });
      });
      
      // Navigate after animation finishes
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 550);
    });
  });

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
    // Global Parallax Layers
    if (!reduceMotionPref && window.ScrollTrigger) {
      
      // 1. Atmosphere Orbs (Fixed behind content)
      window.gsap.utils.toArray('.parallax-orb').forEach(orb => {
        const speed = parseFloat(orb.getAttribute('data-speed')) || 0;
        // Move them up or down by their speed fraction relative to the total scroll height
        window.gsap.to(orb, {
          y: () => window.ScrollTrigger.maxScroll("window") * speed,
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: "max",
            scrub: true,
            invalidateOnRefresh: true
          }
        });
      });

      // 2. High-Performance DOM Parallax (Headers and Cards)
      window.gsap.utils.toArray('[data-speed]:not(.parallax-orb)').forEach(el => {
        const speed = parseFloat(el.getAttribute('data-speed'));
        if(speed === 1 || isNaN(speed)) return;
        
        // 1.0 is normal speed (no parallax). 
        // 0.95 means it should move 5% SLOWER than the scroll (so it slides UP visually an extra 5% of viewport)
        // 1.05 means it should move 5% FASTER than the scroll (so it slides DOWN visually)
        
        const yOffset = (1 - speed) * 100; // e.g. (1 - 0.95) * 100 = 5vh 
        
        window.gsap.fromTo(el, 
          { y: `${-yOffset}vh` }, // Start slightly offset in one direction
          { 
            y: `${yOffset}vh`, // End slightly offset in the other
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom", // Start when top of element hits bottom of screen
              end: "bottom top",   // End when bottom of element hits top of screen
              scrub: true
            }
          }
        );
      });
    }

    // =========================
    // Active Nav Highlight on Scroll
    // =========================
    const navPills = document.querySelectorAll('header nav .nav-pill[href^="#"]');
    if (navPills.length > 0) {
      navPills.forEach(pill => {
        const sectionId = pill.getAttribute('href');
        const section = document.querySelector(sectionId);
        if (!section) return;
        
        window.ScrollTrigger.create({
          trigger: section,
          start: 'top 40%',
          end: 'bottom 40%',
          onEnter: () => setActiveNav(pill),
          onEnterBack: () => setActiveNav(pill),
        });
      });
      
      function setActiveNav(activePill) {
        navPills.forEach(p => p.classList.remove('nav-pill-active'));
        activePill.classList.add('nav-pill-active');
      }
    }

  }

  // =========================
  // Scroll-Triggered Reveals
  // =========================
  if (hasGSAP && !reduceMotionPref) {
    // Tag everything we want to reveal
    const revealSelectors = [
      '#about .glass',
      '#highlights .glass',
      '#skills .glass',
      '#experience .glass',
      '#projects .glass',
      '#exploring .glass',
      '.os-header',
      '.timeline-item',
      '.cert-row',
      '.contact-card'
    ];
    
    document.querySelectorAll(revealSelectors.join(',')).forEach(el => {
      el.classList.add('reveal');
    });

    // Use ScrollTrigger.batch for stagger-grouped reveals
    window.ScrollTrigger.batch('.reveal', {
      onEnter: (batch) => {
        window.gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
          overwrite: true,
          onComplete: function() {
            // Add class so CSS can take over
            batch.forEach(el => el.classList.add('is-visible'));
          }
        });
      },
      start: 'top 88%',
      once: true  // Only animate in once, don't re-hide
    });

    // =========================
    // Terminal Decipher Text Reveal
    // =========================
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':,./<>?";
    const decipherElements = document.querySelectorAll('.decipher-text');

    decipherElements.forEach(el => {
      // Safely store true text content (innerText is empty if element is hidden by CSS/GSAP initially)
      if (!el.dataset.originalText) {
        el.dataset.originalText = el.textContent.trim();
      }
      const originalText = el.dataset.originalText;
      
      // Preserve whitespace layout during scrambling
      el.style.whiteSpace = "pre-wrap";
      
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 92%', // Trigger when it enters
        once: true,
        onEnter: () => {
          let iteration = 0;
          let interval = setInterval(() => {
            el.textContent = originalText
              .split("")
              .map((letter, index) => {
                // Keep spaces as spaces
                if(letter === " ") return " ";
                // Resolve correct letters progressively
                if(index < iteration) {
                  return originalText[index];
                }
                // Scramble the rest
                return chars[Math.floor(Math.random() * chars.length)];
              })
              .join("");
            
            // Adjust speed (increase denominator for slower reveal)
            if(iteration >= originalText.length){ 
              clearInterval(interval);
              // Ensure perfect reset at the end
              el.textContent = originalText;
            }
            iteration += 1 / 3; // Controls speed (smaller delta = slower)
          }, 40); // 40ms per frame
        }
      });
    });
  }

  // =========================
  // Flashlight Glow on Glass Cards
  // =========================
  const glassCards = document.querySelectorAll('.glass.card-hover');
  if (glassCards.length > 0 && !('ontouchstart' in window)) {
    glassCards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // =========================
  // Animated Stats Counter
  // =========================
  const statCounters = document.querySelectorAll('.stat-counter');
  if (statCounters.length > 0 && hasGSAP && !reduceMotionPref) {
    statCounters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-target'));
      const prefix = counter.getAttribute('data-prefix') || '';
      const suffix = counter.getAttribute('data-suffix') || '';
      
      window.ScrollTrigger.create({
        trigger: counter,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          const obj = { val: 0 };
          window.gsap.to(obj, {
            val: target,
            duration: 1.5,
            ease: "power2.out",
            onUpdate: () => {
              const current = Math.round(obj.val);
              const sign = (prefix === '+' && current > 0) ? '+' : '';
              counter.innerText = `${sign}${current}${suffix}`;
            }
          });
        }
      });
    });
  }

  // =========================
  // Back to Top Button
  // =========================
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn && hasGSAP) {
    // Show/hide based on scroll position using GSAP
    window.ScrollTrigger.create({
      start: 'top -800px', // Show after scrolling 800px down
      end: 99999,
      toggleClass: {targets: backToTopBtn, className: "is-visible"},
      onEnter: () => window.gsap.to(backToTopBtn, {opacity: 1, pointerEvents: 'auto', duration: 0.3}),
      onLeaveBack: () => window.gsap.to(backToTopBtn, {opacity: 0, pointerEvents: 'none', duration: 0.3}),
    });

    // Scroll to top on click
    backToTopBtn.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
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
  // Magnetic Buttons
  // =========================
  (() => {
    if (reduceMotionPref) return;
    const magneticBtns = document.querySelectorAll(".contact-icon");
    
    magneticBtns.forEach((btn) => {
      const svg = btn.querySelector("svg");
      
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Distance from center
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        
        // Magnetic pull factor
        const pullBtn = 0.35;
        const pullSvg = 0.45;
        
        btn.classList.add('is-magnetic');
        btn.style.transform = `translate3d(${distanceX * pullBtn}px, ${distanceY * pullBtn}px, 0) scale(1.07)`;
        if (svg) svg.style.transform = `translate3d(${distanceX * pullSvg}px, ${distanceY * pullSvg}px, 0) scale(1.15)`;
      });
      
      btn.addEventListener("mouseleave", () => {
        btn.classList.remove('is-magnetic');
        btn.style.transform = "";
        if (svg) svg.style.transform = "";
      });
    });
  })();

  // =========================
  // Scroll-tied Timeline (Experience)
  // =========================
  (() => {
    if (reduceMotionPref || !hasGSAP) return;
    const timelineSection = document.getElementById("experience");
    if (!timelineSection) return;
    
    // We add an active class to timeline items as we scroll past them
    const items = timelineSection.querySelectorAll(".timeline-item");
    items.forEach((item) => {
      window.gsap.to(item, {
        scrollTrigger: {
          trigger: item,
          start: "top 65%",
          toggleClass: "is-active"
        }
      });
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
    let vx = 0, vy = 0;
    let tx = 220, ty = 160;

    let last = performance.now();
    let cruise = rand(70, 96);

    let nextTargetAt = 0;
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
      const dist = Math.hypot(dx, dy) || 0.0001;

      const arrive = dist < 18 ? 0.80 : 1.0;

      const desiredVX = (dx / dist) * speed;
      const desiredVY = (dy / dist) * speed;

      const steer = boosting ? 0.12 : 0.085;
      vx += (desiredVX - vx) * steer;
      vy += (desiredVY - vy) * steer;

      vx *= arrive;
      vy *= arrive;

      x += vx * dt;
      y += vy * dt;

      isMobile() ? clampMobile() : clampDesktop();

      if (Math.abs(vx) > 6) dirState = vx >= 0 ? 1 : -1;

      const bob = Math.sin(now * 0.003 + 1.7) * (boosting ? 2.0 : 2.6);

      const sp = Math.hypot(vx, vy);
      const trail = clamp((sp - 10) / 120, 0, 1);
      el.style.setProperty("--trail", trail.toFixed(3));

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

  // =========================
  // Neural Network Cursor
  // =========================
  const cursorCanvas = document.getElementById("neural-cursor");
  if (cursorCanvas && !('ontouchstart' in window)) { // Only on non-touch devices
    const ctx = cursorCanvas.getContext("2d");
    
    // Resize canvas to match window
    const resizeCanvas = () => {
      cursorCanvas.width = window.innerWidth;
      cursorCanvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Mouse coordinates (target)
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let isHovering = false; // Flag for when over a button/link

    // Listen for mouse moves
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      
      // Check if hovering over interactive elements to expand the cursor
      const target = e.target;
      isHovering = !!(target.closest('a') || target.closest('button') || target.closest('.card-hover') || target.closest('.is-magnetic'));
    });

    // The trailing nodes configuration
    const numNodes = 6;
    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
        nodes.push({ x: mouse.x, y: mouse.y, radius: i === 0 ? 3 : 1.5 });
    }

    // Animation Loop
    const drawCursor = () => {
      // Clear previous frame
      ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
      
      // Update positions (physics)
      // Node[0] follows the mouse closely (spring physics)
      // The rest follow the node ahead of them
      let targetX = mouse.x;
      let targetY = mouse.y;
      
      nodes.forEach((node, index) => {
        // Friction/Easing based on depth
        const easing = index === 0 ? 0.35 : 0.45;
        
        // Move towards target
        node.x += (targetX - node.x) * easing;
        node.y += (targetY - node.y) * easing;
        
        // Next node's target is THIS node's position
        targetX = node.x;
        targetY = node.y;
      });

      // Draw Connections (Lines)
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < numNodes; i++) {
        ctx.lineTo(nodes[i].x, nodes[i].y);
      }
      ctx.strokeStyle = `rgba(34, 211, 238, ${isHovering ? 0 : 0.4})`; // Hide lines when hovering
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Nodes (Dots)
      nodes.forEach((node, index) => {
        ctx.beginPath();
        // The first node (lead) expands if hovering an interactive element
        const targetRadius = index === 0 && isHovering ? 24 : node.radius;
        // Smooth radius transition
        node.currentRadius = node.currentRadius || node.radius;
        node.currentRadius += (targetRadius - node.currentRadius) * 0.2;
        
        ctx.arc(node.x, node.y, node.currentRadius, 0, Math.PI * 2);
        
        if (index === 0) {
           // Lead dot (Cyan or hollow ring when hovering)
           ctx.fillStyle = isHovering ? "rgba(34, 211, 238, 0.1)" : "rgba(34, 211, 238, 1)";
           if (isHovering) {
               ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
               ctx.lineWidth = 1.5;
               ctx.stroke();
           }
        } else {
           // Trail dots (Violet fading out)
           ctx.fillStyle = `rgba(168, 85, 247, ${1 - (index / numNodes)})`;
           if (isHovering) ctx.fillStyle = "transparent"; // Hide trail when hovering
        }
        ctx.fill();
      });

      requestAnimationFrame(drawCursor);
    };

    // Start loop
    drawCursor();
  }

  // =========================
  // Scroll-Linked Twinkling Stars
  // =========================
  const bgCanvas = document.getElementById("ai-bg");
  if (bgCanvas && !reduceMotionPref) {
    const ctx = bgCanvas.getContext("2d");
    let width, height;
    
    // Star properties
    const numStars = window.innerWidth < 768 ? 80 : 200;
    const stars = [];
    
    const resizeBg = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      bgCanvas.width = width;
      bgCanvas.height = height;
    };
    window.addEventListener("resize", resizeBg);
    resizeBg();

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius: Math.random() * 1.2 + 0.2, // 0.2 to 1.4px
        life: Math.random(),
        speed: Math.random() * 0.05 + 0.01,
        parallaxSpeed: Math.random() * 0.4 + 0.1 // For scroll
      });
    }

    let scrollY = window.scrollY;
    let prevScrollY = scrollY;
    let scrollVelocity = 0;
    
    // Make sure we hook into Lenis if it exists since it handles smooth scrolling
    // Otherwise fallback to native scroll
    const updateScrollState = (customY, customVelocity) => {
      scrollY = customY !== undefined ? customY : window.scrollY;
      
      if (customVelocity !== undefined) {
        // Lenis provides reliable velocity
        scrollVelocity = Math.abs(customVelocity);
      } else {
        // Fallback calculation
        const rawVelocity = Math.abs(scrollY - prevScrollY);
        scrollVelocity += (rawVelocity - scrollVelocity) * 0.2; // Lerp
      }
      prevScrollY = scrollY;
    };
    
    window.addEventListener('scroll', () => updateScrollState(), {passive: true});
    
    // Hack: Wait a tick to see if Lenis was initialized globally elsewhere in main.js
    setTimeout(() => {
      if (typeof lenis !== 'undefined' && lenis) {
        lenis.on('scroll', (e) => updateScrollState(e.scroll, e.velocity));
      }
    }, 100);

    const drawStars = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Decay velocity if natively calculated, to handle stopping
      if (typeof lenis === 'undefined' || !lenis) {
        scrollVelocity *= 0.95; 
      }
      
      // Warp factor: 0 = idle, 1 = max warp. Lowered the divisor to make it MORE sensitive (was 40, now 15)
      const warpFactor = Math.min(scrollVelocity / 15, 1);
      
      stars.forEach(star => {
        // Twinkle
        star.life += star.speed;
        const baseOpacity = Math.abs(Math.sin(star.life)) * 0.8 + 0.2;
        // Brighter during warp
        const opacity = baseOpacity + (warpFactor * 0.4);
        const radius = star.baseRadius + (Math.sin(star.life) * 0.4);

        // Parallax scroll position
        let currentY = star.y - (scrollY * star.parallaxSpeed);
        
        // Wrap around
        if (currentY < 0) {
          currentY = height - (Math.abs(currentY) % height);
        } else if (currentY > height) {
          currentY = currentY % height;
        }

        // During warp: stretch stars into vertical streaks
        const streakLength = warpFactor * (star.parallaxSpeed * 30);
        
        if (streakLength > 0.5) {
          // Draw as a streak line
          ctx.beginPath();
          ctx.moveTo(star.x, currentY - streakLength);
          ctx.lineTo(star.x, currentY + streakLength);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, opacity)})`;
          ctx.lineWidth = Math.max(0.3, radius * 0.6);
          ctx.stroke();
        } else {
          // Normal dot
          ctx.beginPath();
          ctx.arc(star.x, currentY, Math.max(0.1, radius), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, opacity)})`;
          ctx.fill();
        }
        
        // Add subtle cyan/violet glow to larger stars
        if (star.baseRadius > 1.0) {
           ctx.shadowBlur = 4 + (warpFactor * 4);
           ctx.shadowColor = (star.life % 2 < 1) ? 'rgba(34, 211, 238, 0.4)' : 'rgba(168, 85, 247, 0.4)';
           if (streakLength > 0.5) { ctx.stroke(); } else { ctx.fill(); }
           ctx.shadowBlur = 0; // Reset
        }
      });
      requestAnimationFrame(drawStars);
    };
    drawStars();
  }

  // =========================
  // 3D Holographic Card Hover
  // =========================
  if (!reduceMotionPref && !('ontouchstart' in window)) {
    const cards = document.querySelectorAll('.card-hover');
    
    cards.forEach(card => {
      // Inject glare element into the card
      const glare = document.createElement('div');
      glare.className = 'card-glare';
      card.appendChild(glare);

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element
        const y = e.clientY - rect.top;  // y position within the element

        // Calculate rotation (center is 0, edges max out at +/- 5 degrees)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        // Apply 3D transform
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        
        // Move the glare
        card.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);
        glare.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        // Reset transform smoothly
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        glare.style.opacity = '0';
      });
    });
  }

  // =========================
  // Magnetic Buttons
  // =========================
  if (hasGSAP && !reduceMotionPref && !('ontouchstart' in window)) {
    const magneticElements = document.querySelectorAll('.is-magnetic');
    
    magneticElements.forEach(el => {
      // Create quick setters for performance
      const xTo = window.gsap.quickTo(el, "x", {duration: 0.6, ease: "power3", duration: 0.4});
      const yTo = window.gsap.quickTo(el, "y", {duration: 0.6, ease: "power3", duration: 0.4});
      
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        // Calculate distance from center of element (range roughly -1 to 1)
        const relX = (e.clientX - rect.left) - (rect.width / 2);
        const relY = (e.clientY - rect.top) - (rect.height / 2);
        
        // Move element slightly towards cursor (magnetic pull strength = 0.3)
        xTo(relX * 0.3);
        yTo(relY * 0.3);
      });
      
      el.addEventListener('mouseleave', () => {
        // Snap back to origin
        xTo(0);
        yTo(0);
      });
    });
  }

  // =========================
  // Project Detail Page Logic
  // =========================
  const pdData = {
    "slackbot": {
      title: "Slack Python QnA Bot",
      timeline: "Nov 2025",
      role: "AI Engineer",
      team: "Solo / Internal Tool",
      tags: ["Python", "Slack API", "NLP"],
      image: "assets/img/1.webp",
      links: [
        { label: "GitHub", url: "https://github.com/AII-projects/slackbot", icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>Developers and team members were constantly switching context to ask repetitive Python, infrastructure, and HR-related questions. The objective was to build an automated organizational support agent integrated directly into the company's Slack workspace to intercept tier-1 support queries.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>The bot is built using Python and leverages the official <strong>Slack Bolt API</strong> for real-time event listening. When a user asks a question, the message is routed through a <strong>Natural Language Processing (NLP)</strong> layer to determine intent. If the query matches a known symptom or repetitive question, the bot immediately fetches the resolution from an internal knowledge base.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>By handling tier-1 inquiries automatically, this agent significantly reduced the volume of IT and HR support tickets. This allowed the engineering team to maintain deep focus states without constant context switching, materially improving sprint velocity.</p>
        </div>
      `
    },
    "faster-diffusion": {
      title: "Faster Diffusion",
      timeline: "Spring 2025",
      role: "ML Researcher",
      team: "Team of 3",
      tags: ["PyTorch", "Diffusion", "CUDA"],
      image: "assets/img/2.webp",
      links: [
        { label: "GitHub Repo", url: "https://github.com/GoDSpeeD0o0/GenAIProject", icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>Stable Diffusion models are notoriously slow during inference, often requiring massive GPU compute to generate a single image within an acceptable timeframe. The primary objective was to reduce latency on local consumer hardware without sacrificing visual fidelity.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>We attacked the problem from multiple angles using <strong>PyTorch</strong> and <strong>CUDA</strong> optimizations. First, we implemented <strong>Token Merging (ToMe)</strong>, which identifies and fuses redundant tokens in the attention layers, drastically reducing the required matrix multiplications. Second, we optimized the hardware-aware scheduling to maximize tensor core utilization.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>Our combined optimizations resulted in a massive <strong>41% reduction in inference time</strong> on local consumer hardware. The generated images maintained a structural similarity index (SSIM) of >0.98 compared to the unoptimized baseline, proving that significant speedups do not require a compromise in quality.</p>
        </div>
      `
    },
    "particle-pollution": {
      title: "Particle Pollution CNN",
      timeline: "May 2022",
      role: "Lead Author",
      team: "Academic Research",
      tags: ["TensorFlow", "CNN", "Research"],
      image: "assets/img/3.webp",
      links: [
        { label: "Read Paper", url: "https://github.com/GoDSpeeD0o0/Research-Paper/tree/main/MachineLearningAnalysis_Particle_Pollution", icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>Urban air quality monitoring is typically reliant on sparse, expensive ground sensors. Our objective was to determine if machine learning algorithms could accurately predict and map PM 2.5 particle distribution remotely by synthesizing meteorological data and satellite imagery.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>We designed a dual-input Convolutional Neural Network (CNN) inside <strong>TensorFlow / Keras</strong>. The architecture processes sequential weather telemetry alongside spatial satellite snapshots. By fusing these multimodal features before the final classification layers, the model learns the complex relationship between wind patterns, humidity, and particulate clustering.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>The neural network achieved a highly correlative prediction accuracy against ground truth sensors. This research was peer-reviewed and officially accepted at the <strong>ICoAC conference</strong>. The open-source prediction framework is now available for other researchers to adopt scale cost-effective air quality monitoring in developing countries.</p>
        </div>
      `
    },
    "tweet-sentiment": {
      title: "Tweet Sentiment Pipeline",
      timeline: "Apr 2024",
      role: "Data Engineer",
      team: "Solo Project",
      tags: ["NLP", "Transformers", "API"],
      image: "assets/img/4.webp",
      links: [
        { label: "GitHub Repo", url: "https://github.com/GoDSpeeD0o0/TextSentimentAnalysis", icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>Design an end-to-end data pipeline capable of ingesting, sanitizing, and classifying the semantic sentiment of large-scale Twitter streams in real-time, allowing businesses to monitor brand perception dynamically.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>The system connects to the <strong>Twitter API</strong> to listen for specific keyword streams. Raw tweets are sanitized (removing URLs, handles, and special characters) using regex, then batched and passed into a fine-tuned <strong>ALBERT Transformer model</strong>. ALBERT was chosen over standard BERT due to its parameter-sharing architecture, which vastly improved throughput and reduced memory overhead.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>The pipeline successfully processed thousands of tweets per minute with >90% operational uptime. The high-accuracy categorization pumped resulting sentiment scores into a visual dashboard, allowing for live tracking of public reaction trends to specific events.</p>
        </div>
      `
    },
    "digital-assets": {
      title: "Digital Assets Pipeline",
      timeline: "2024",
      role: "Data Engineer",
      team: "Enterprise Build",
      tags: ["Snowflake", "dbt", "Airflow"],
      image: "assets/img/5.webp",
      links: [
        { label: "Architecture", url: "https://github.com/AII-projects/DigitalAssetsAnalyticsPipeline", icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>Processing millions of daily digital asset transactions requires a rock-solid, scalable architecture. The existing systems were struggling with data latency, schema drift, and validation bottlenecks. The objective was to modernize the entire stack to handle exponential data growth.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>I architected a modern ETL stack centered around <strong>Snowflake</strong> for the data warehouse and <strong>dbt (data build tool)</strong> for the transformation layer. All ingestion jobs and DAG dependencies were orchestrated using <strong>Apache Airflow</strong> to ensure cron-like reliability.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>Crucially, the pipeline implements strict data governance. dbt tests run on every pull request, ensuring that anomalies, nulls, or schema changes fail the CI/CD pipeline before they can pollute the production warehouse. This resulted in a 99.9% reduction in downstream dashboard errors.</p>
        </div>
      `
    },
    "stock-prediction": {
      title: "Algorithmic Trading Stack",
      timeline: "Ongoing",
      role: "Quant Developer",
      team: "Solo / R&D",
      tags: ["PyTorch", "LSTM", "DuckDB"],
      image: "assets/img/6.webp",
      links: [
        { label: "In Development", url: "#", icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` }
      ],
      story: `
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-400"></div> Objective</h3>
          <p>A personal R&D project building a full-stack algorithmic trading and backtesting engine for U.S. equities, from data ingestion to live-simulated execution.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-violet-400"></div> Tech Stack & Architecture</h3>
          <p>The system is split into three core Python microservices:<br><br>
          1. <strong>ETL Engine</strong>: Pulls daily and intraday ticking data from external APIs, normalizes it using Pandas, and stores it in a fast local DuckDB instance.<br>
          2. <strong>Predictive Model</strong>: A PyTorch-based sequence modeling engine testing LSTM networks and Temporal Fusion Transformers (TFT) to forecast momentum based on order book imbalance.<br>
          3. <strong>Execution Engine</strong>: A systematic backtesting harness that simulates slippage, commission, and latency.</p>
        </div>
        
        <div class="glass p-8 rounded-2xl border border-white/5 mb-8">
          <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-400"></div> Results & Impact</h3>
          <p>This project is currently in active development. The underlying DuckDB architecture has proven highly performant for iterating through historical backtests locally without cloud costs.</p>
        </div>
      `
    }
  };

  // Check if we are on the project detail page
  const pdContainer = document.getElementById('project-content');
  if (pdContainer) {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const project = pdData[projectId];
    const errorState = document.getElementById('project-error');

    if (!project) {
      if (errorState) errorState.classList.remove('hidden');
    } else {
      // Inject Data
      document.getElementById('pd-title').textContent = project.title;
      document.getElementById('pd-timeline').textContent = project.timeline;
      document.getElementById('pd-role').textContent = project.role;
      
      // Inject Team Size with Icon
      document.getElementById('pd-team').innerHTML = `
        <div class="flex items-center gap-2 text-white/90">
          <svg class="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          ${project.team}
        </div>
      `;
      
      document.getElementById('pd-hero-img').src = project.image;
      document.getElementById('pd-story').innerHTML = project.story;

      // Inject Tags
      const tagsContainer = document.getElementById('pd-tags');
      project.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'pill';
        span.textContent = tag;
        tagsContainer.appendChild(span);
      });

      // Inject Links (Icon style)
      const linksContainer = document.getElementById('pd-links');
      linksContainer.className = "flex flex-wrap gap-3"; // update layout
      project.links.forEach((link, idx) => {
        const a = document.createElement('a');
        // If it's the primary link, make it pop. Otherwise subtle.
        a.className = idx === 0 
          ? 'flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-cyan-200 hover:scale-105 transition-all text-sm group'
          : 'flex items-center gap-2 px-5 py-2.5 glass border border-white/20 text-white font-semibold rounded-full hover:bg-white/10 hover:border-white/40 transition-all text-sm group';
        a.href = link.url;
        a.innerHTML = `
          <span class="opacity-80 group-hover:opacity-100 transition-opacity">${link.icon || ''}</span>
          ${link.label}
        `;
        if (link.url !== '#') {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        linksContainer.appendChild(a);
      });

      // Trigger entrance animation
      pdContainer.classList.remove('hidden');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pdContainer.classList.remove('opacity-0', 'translate-y-4');
        });
      });
    }
  }

})();