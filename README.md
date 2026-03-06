# Prateek Parashar — Portfolio 🚀

A highly interactive, performance-optimized portfolio website built for a modern "Model OS" and "GenAI" aesthetic. Features fluid WebGL backgrounds, glassmorphism UI, smooth scrolling, and dynamic project case studies without the overhead of a heavy JavaScript framework.

**[🌐 View Live Site](https://godspeed0o0.github.io/)**

---

## ✨ Features

- **Cinematic WebGL & Canvas Backgrounds**: A custom shader-powered aurora borealis and a scroll-velocity reactive starfield (warp-drive effect).
- **Smooth Scrolling**: Integrated with [Lenis](https://studiofreight.github.io/lenis/) for butter-smooth parallax and scroll-trigger animations.
- **Dynamic Project Case Studies**: JavaScript-powered dynamic routing (`project-detail.html?id=...`) to inject rich, styled project data without needing a backend or a static site generator.
- **Advanced Micro-Interactions**: 
  - GSAP-powered magnetic buttons that pull towards the cursor.
  - 3D holographic tilt effects on project cards.
  - Custom SVG drawing animations and an interactive "AI Rover".
- **Glassmorphism UI**: Beautiful frosted glass panels, deep dark mode gradients, and vibrant neon accents.
- **Performance First**: Lazy-loaded WebP images, local fonts, and a compiled Tailwind CSS stylesheet (no runtime CDN).

---

## 🛠 Tech Stack

- **Core**: Vanilla HTML5, CSS3, JavaScript (ES6+). No React, Vue, or heavy frameworks.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Compiled via PostCSS/CLI).
- **Animation**: [GSAP (GreenSock)](https://gsap.com/) & ScrollTrigger for timeline animations and scroll-linked reveals.
- **Scroll Hijacking**: Lenis Smooth Scroll API.
- **Hosting**: GitHub Pages.

---

## 🚀 Local Development Setup

We recently moved from a Tailwind CDN to a locally compiled Tailwind CSS workflow for better performance. 

### 1. Prerequisites
You will need [Node.js](https://nodejs.org/) installed on your machine.

### 2. Install Dependencies
Clone the repository and install the required npm packages:
```bash
git clone https://github.com/GoDSpeeD0o0/GoDSpeeD0o0.github.io.git
cd GoDSpeeD0o0.github.io
npm install
```

### 3. Start Tailwind Compiler (Watch Mode)
To automatically recompile the Tailwind CSS file (`assets/css/tailwind.css`) whenever you make changes to your HTML or CSS input files, run:
```bash
npm run watch:css
```

### 4. Serve the HTML
Since this uses ES6 modules and fetches local data, you must serve the files through a local web server (opening `index.html` directly in the browser via `file://` will cause CORS/module errors).

You can use the **Live Server** extension in VS Code, or run:
```bash
npx serve .
```

---

## 📂 Project Structure

\`\`\`text
├── assets/
│   ├── css/
│   │   ├── main.css           # Custom CSS animations & base styles
│   │   ├── tailwind-input.css # Tailwind source file
│   │   └── tailwind.css       # Compiled output (included in HTML)
│   ├── img/                   # WebP compressed images & icons
│   └── js/
│       └── main.js            # Core application logic, GSAP animations, Project JSON DB
├── experience.html            # Work history & timeline
├── index.html                 # Landing page & featured highlights
├── projects.html              # Portfolio grid of all projects
├── project-detail.html        # Dynamic template for individual case studies
├── package.json               # NPM scripts and Tailwind dependencies
└── README.md
\`\`\`

---

## 📝 License

Designed and engineered by Prateek Parashar. 
Open for inspiration, but please do not blindly clone and deploy as your own portfolio without significant modifications.
