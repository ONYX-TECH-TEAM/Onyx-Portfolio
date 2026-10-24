# Onyx Tech House — Interactive Portfolio

**A cinematic, interactive 3D portfolio experience for Onyx Tech House.**

Repository: [ONYX-TECH-TEAM/Onyx-Portfolio](https://github.com/ONYX-TECH-TEAM/Onyx-Portfolio)  
Status: **In active development**

---

## Overview

The Onyx Tech House portfolio is designed as an immersive journey through the agency's services, projects, and case studies. Instead of presenting the agency as a conventional grid of service cards, the experience uses a persistent 3D environment, a central Onyx object, and five orbiting shards as the visual framework for exploring the agency.

The intended content hierarchy is:

**ONYX → Agency Domains → Projects → Project Case Studies**

The experience combines scroll-driven camera movement, 3D assets, atmospheric effects, domain-focused interactions, and dedicated case-file routes. The visual direction is cinematic, minimal, and dark, with service-specific accent colors.

## Agency Domains

The portfolio is organized around five service areas:

1. **AI Solutions** — AI systems and automation.
2. **Product Development** — digital products and custom software.
3. **UI/UX Design** — user experiences and interface design.
4. **Social Media Marketing** — social content and digital marketing.
5. **Branding & Logo Design** — brand identity and visual systems.

Project and case-study content is still being developed. The current project metadata file (`src/data/projects.js`) is an empty foundation, so the repository should not yet be treated as a complete, content-populated portfolio.

## Experience Highlights

- **Interactive 3D scene:** Built with Three.js and React Three Fiber.
- **Central Onyx object and orbital shards:** Five physical shard assets anchor the agency's visual identity.
- **Scroll-driven journey:** The camera and portfolio timeline respond to scroll progress.
- **Domain exploration:** Service areas have distinct visual identities and interaction states.
- **Case-file pages:** Project routes follow `/projects/:domainSlug/:systemId`.
- **Atmospheric environment:** Procedural space effects and lighting support the cinematic presentation.
- **3D model assets:** GLB models, including lower-detail shard variants, are stored in `public/models/`.
- **Responsive interface:** The portfolio combines the 3D canvas with HTML-based interface and case-study content.

The exact project content and end-to-end experience are still evolving. Features listed here describe the current structure and direction, not a claim that the site is production-ready.

## Technology Stack

| Area | Technology |
|---|---|
| UI | React 19 |
| Build tooling and development server | Vite 8 |
| 3D rendering | Three.js |
| React 3D integration | React Three Fiber |
| 3D helpers | Drei |
| Routing | React Router 7 |
| Performance diagnostics | `r3f-perf` |
| Language | JavaScript with JSX |
| Styling | CSS |
| 3D asset format | GLB / glTF binary models |

## Project Structure

```text
Onyx-Portfolio/
├── public/
│   └── models/                 # Onyx and shard GLB assets
├── src/
│   ├── components/             # 3D scene, camera, domains and UI components
│   ├── data/
│   │   ├── projects.js          # Project metadata foundation
│   │   └── sceneStates.js       # Saved scene/camera configuration
│   ├── hooks/                  # Scroll and timeline logic
│   ├── pages/
│   │   └── CaseFilePage.jsx     # Project case-file page
│   ├── utils/                  # Scene and rendering utilities
│   ├── App.jsx                 # Routes and portfolio composition
│   ├── index.css               # Global styles
│   └── main.jsx                # Application entry point
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js compatible with the version of Vite used by this project.
- npm.
- A modern desktop browser with WebGL support for the full 3D experience.

### 1. Clone the repository

```bash
git clone https://github.com/ONYX-TECH-TEAM/Onyx-Portfolio.git
cd Onyx-Portfolio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Vite will print the local development URL in the terminal, usually `http://localhost:5173`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the optimized production build in `dist/`. |
| `npm run preview` | Preview the generated production build locally. |
| `npm run lint` | Run ESLint across the project. |

Before submitting changes, run:

```bash
npm run lint
npm run build
```

The preview command is for local verification; it does not deploy the site to a hosting provider.

## 3D Assets and Performance

The 3D models are stored in `public/models/`. The repository includes the central Onyx model and shard models, with lower-detail variants available for selected shards.

When changing the scene, keep the experience visually coherent while considering rendering cost:

- Avoid adding unnecessary continuously running animation loops or React state updates per frame.
- Keep high-detail model loading and rendering scoped to where it is needed.
- Test at desktop and mobile viewport sizes, and on hardware with different GPU capabilities.
- Check camera transitions, model visibility, and case-file navigation after scene changes.
- Run a production build when checking performance; Vite's development server adds overhead that is not representative of the production bundle.

These are development guidelines, not a guarantee of a specific frame rate on every device.

## Development Notes

- The portfolio's main page is `/`.
- Case-file routes use `/projects/:domainSlug/:systemId`.
- The project list is currently an empty array in `src/data/projects.js`; add and validate project metadata before expecting populated case studies.
- Scene-state and camera configuration are maintained in the source data and scene components. Make scene changes carefully and verify the complete scroll journey afterward.
- No production URL or deployment provider is specified in this repository yet.

## Security and Repository Hygiene

- Keep local `.env` files and credentials out of Git.
- Do not place private API keys or server-side secrets in frontend code or `VITE_` environment variables; values shipped to a browser are public.
- Do not commit `node_modules/`, build output, logs, or local-only files.
- Review changes to development-server middleware before exposing a development server to an untrusted network.

The repository's `.gitignore` already excludes `.env` files, `node_modules/`, build output, and several local artifacts. Always review `git status` before committing.

## Contributor

**Muhammad Subhan** — [@SubhanAamirX0](https://github.com/SubhanAamirX0)

Primary contributor to the Onyx Tech House portfolio, including its interactive 3D experience, scene and camera journey, service-domain exploration, and portfolio implementation.

## Organization

Developed for **Onyx Tech House**.

- **GitHub organization:** [ONYX-TECH-TEAM](https://github.com/ONYX-TECH-TEAM)
- **Repository:** [Onyx-Portfolio](https://github.com/ONYX-TECH-TEAM/Onyx-Portfolio)

---

*Onyx Tech House — Idea · Creativity · AI · Technology · Solution.*
