
# Prateek Parashar — Resume Website (Model OS / GenAI Theme)

A lightweight, animated resume website built for GitHub Pages designed with a “Model OS” UI vibe: clean cards, subtle glow, a projects drawer, and a shader-powered background.

## Live
- GitHub Pages: GoDSpeeD0o0.github.io

---

## Features
- **Hero landing** with neon 3D-ish name text + one-line headline
- **Smooth background** (WebGL shader, with 2D canvas fallback)
- **Rover animation** (desktop: roams the viewport; mobile: roams around the name)
- **Scroll progress bar** under the header
- **Scroll reveal**: cards gently fade/slide in on scroll
- **Projects drawer** (horizontal):
  - single click = pin/highlight
  - drag/swipe = scroll
  - auto advance every 10 seconds
  - double click or press Enter = open repository
- **Nav section highlight**: active section is highlighted while scrolling
- **Model OS HUD** (desktop scrollytelling): shows the “current module” as you scroll
- **Hero → section transition** (overlay scan/warp effect)

---

## Tech Stack
- **HTML + Tailwind CDN** (no build step)
- **Custom CSS** for glass UI, animations, transitions
- **Vanilla JS** for scroll observers, projects logic, rover movement, WebGL shader

