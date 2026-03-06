# Prateek Parashar — Portfolio 🚀

A highly interactive, performance-optimized personal portfolio and resume website with a "Model OS" and "GenAI" aesthetic. Designed with fluid WebGL backgrounds, smooth scrolling, and an interactive project case study viewer.

We built this for maximum visual impact, using modern web technologies without the bloat of a heavy JavaScript framework.

**[🌐 View Live Site](https://GoDSpeeD0o0.github.io/)**

---

## ✨ Features

- **Cinematic Environment**: Dynamic WebGL-powered 3D aurora borealis and an interactive "warp speed" starfield that reacts to your scrolling velocity.
- **Dynamic Case Studies**: An elegant, slide-in interface for project details, featuring frosted glassmorphism cards. Everything is configured via a JSON data store, no separate backend needed!
- **Smooth Navigation**: Custom scrolling physics (via Lenis API) integrated with GSAP animations.
- **Premium Aesthetics**: Glassmorphism UI, neon gradients, and a magnetic cursor effect that pulls interactive elements toward your mouse.
- **Lightning Fast**: Optimized for speed, we serve WebP imagery and completely pre-compile all the CSS, stripping out unused code.

---

## 🛠 Tech Stack

- **Core Structure**: Semantic HTML5 and Vanilla JavaScript (ES6+).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) — We use the modern Node.js CLI to heavily compress and bundle the CSS. 
- **Animation**: [GSAP (GreenSock)](https://gsap.com/) for fluid transitions, timelines, and scroll-linked reveals.

---

## 🚀 Running This Locally (Development Setup)

*Note: The `node_modules` folder and `package.json` files are **not** needed to simply view the website or deploy it to GitHub Pages. They are only used by developers to compile new CSS files if changes are made to the design.*

If you want to edit the HTML or CSS yourself, you need to run the build pipeline:

### 1. Requirements
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Configure Your Compiler
This project uses Tailwind v4 to handle styles. To set it up, generate a `package.json` and install Tailwind in the root of the project:
```bash
npm init -y
npm install -D tailwindcss @tailwindcss/cli
```

### 3. Start the Compiler
Once installed, execute the Tailwind build process in "watch" mode. This will actively listen for any CSS/HTML changes you make and re-compile the `assets/css/tailwind.css` file automatically:
```bash
npx tailwindcss -i assets/css/tailwind-input.css -o assets/css/tailwind.css --watch
```

### 4. View the Site
Because this project utilizes ES6 modules and fetches local data, opening `index.html` directly from your file system (`file://`) will cause browser security errors. You **must** serve it using a local development server like VS Code's "Live Server" extension or via terminal:
```bash
npx serve .
```

---

## 📂 Project Structure

```text
├── assets/
│   ├── css/
│   │   ├── main.css           # Custom CSS animations & base styles
│   │   └── tailwind.css       # Compiled output from Tailwind (Included in HTML)
│   ├── img/                   # WebP compressed images & icons
│   └── js/
│       └── main.js            # Core application logic, GSAP animations, Project JSON DB
├── experience.html            # Work history & timeline
├── index.html                 # Landing page & featured highlights
├── projects.html              # Portfolio grid of all projects
├── project-detail.html        # Dynamic template for individual case studies
└── README.md
```

---

## 📝 License

Designed and engineered by Prateek Parashar.
