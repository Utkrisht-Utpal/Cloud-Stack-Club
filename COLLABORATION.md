# 🤝 Contributing to Cloud Stack Club Website

> Thank you for your interest in contributing!  
> This document is your complete guide to making open-source contributions to the **Cloud Stack Club** official website.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Contact](#contact)

---

## 🧭 Code of Conduct

All contributors are expected to uphold a respectful and inclusive environment.

- Be kind and constructive in all discussions.
- Respect differing opinions and skill levels.
- Harassment, discrimination, or offensive language will not be tolerated.
- Violations can be reported to the club maintainers.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) **v18.0 or higher**
- `npm` (comes with Node.js)
- [Git](https://git-scm.com/)

### Fork & Clone

1. **Fork** this repository by clicking the _Fork_ button at the top-right of the GitHub page.

2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Cloud-Stack-Club.git
   cd Cloud-Stack-Club
   ```

3. **Add the upstream remote** (to stay in sync with the main repo):
   ```bash
   git remote add upstream https://github.com/Utkrisht-Utpal/Cloud-Stack-Club.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🛠️ How to Contribute

### Step-by-step workflow

```
1. Sync your fork with upstream
2. Create a new branch for your change
3. Make your changes
4. Run the build to verify no errors
5. Commit with a descriptive message
6. Push and open a Pull Request
```

### Sync your fork before starting

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

## 🌿 Branch Naming Convention

Use a short, descriptive branch name with a prefix:

| Prefix      | When to use                           | Example                       |
|-------------|---------------------------------------|-------------------------------|
| `feat/`     | New feature or section                | `feat/gallery-page`           |
| `fix/`      | Bug fix                               | `fix/mobile-cta-overlap`      |
| `ui/`       | Visual / styling change               | `ui/neumorphic-cards`         |
| `docs/`     | Documentation only                    | `docs/update-readme`          |
| `refactor/` | Code cleanup without behaviour change | `refactor/theme-context`      |
| `chore/`    | Dependency update, config change      | `chore/upgrade-framer-motion` |

---

## ✍️ Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>
```

### Types

| Type       | Meaning                                 |
|------------|-----------------------------------------|
| `feat`     | A new feature                           |
| `fix`      | A bug fix                               |
| `ui`       | UI / design change                      |
| `docs`     | Documentation changes                   |
| `refactor` | Code refactor with no functional change |
| `chore`    | Build process, package, or config       |
| `perf`     | Performance improvement                 |

### Examples

```bash
feat(events): add event detail modal with highlights list
fix(navbar): correct logo size on dark theme
ui(cards): apply neumorphic shadow to why-join section
docs(readme): update getting started section
```

---

## 🔍 Pull Request Process

1. Ensure your code **builds successfully** before opening a PR:
   ```bash
   npm run build
   ```

2. **Open a Pull Request** against the `main` branch of the upstream repository.

3. Fill in the PR description completely:
   - **What** did you change?
   - **Why** was this change needed?
   - **Screenshots** (for UI changes — before & after)

4. Your PR will be reviewed by a maintainer. Please be responsive to feedback.

5. Once approved, a maintainer will **squash and merge** your PR.

> ⚠️ **Do not** push directly to `main`. All changes must go through a Pull Request.

---

## 📁 Project Structure

```text
cloud-stack-club/
├── public/                    # Static assets (favicon, robots.txt, sitemap.xml)
├── src/
│   ├── assets/images/         # Logos and static images
│   ├── components/
│   │   ├── coming-soon/       # Gallery & Team coming soon pages
│   │   ├── common/            # Navbar, Footer, JoinModal, FloatingMobileCTA
│   │   ├── sections/          # Page sections (Hero, About, Events, Contact …)
│   │   └── ui/                # Reusable UI (Button, Card, Modal, Toast …)
│   ├── constants/
│   │   ├── data.ts            # All site content (domains, events, pillars …)
│   │   └── siteConfig.ts      # Club metadata, links, contact info
│   ├── context/
│   │   └── ThemeContext.tsx   # Dark / light theme provider
│   ├── services/
│   │   ├── supabase.ts        # Supabase client & Gateway
│   │   ├── members.ts         # Member applications & directory
│   │   ├── events.ts          # Events CRUD & scheduling
│   │   ├── registrations.ts   # Event solo & team registrations
│   │   ├── feedback.ts        # Event & contact feedback
│   │   └── roles.ts           # Club role management
│   ├── styles/
│   │   └── index.css          # Tailwind, neumorphism & glassmorphism utilities
│   ├── types/index.ts         # Global TypeScript types
│   └── utils/cn.ts            # Tailwind class-merge utility
├── vite.config.js
├── tsconfig.json
└── package.json
```

### Where to make common changes

| What you want to change           | File to edit                                  |
|-----------------------------------|-----------------------------------------------|
| Club name, tagline, contact info  | `src/constants/siteConfig.ts`                 |
| Domains, events, core values      | `src/constants/data.ts`                       |
| A page section's layout / content | `src/components/sections/<SectionName>.tsx`   |
| Global card / UI styles           | `src/styles/index.css`                        |
| Navigation links                  | `src/components/common/Navbar.tsx`            |

---

## 💡 Development Guidelines

### Tech Stack

| Technology       | Version | Purpose                   |
|------------------|---------|---------------------------|
| React            | 19      | UI framework              |
| TypeScript       | ~5.x    | Type safety               |
| Vite             | ~5.x    | Build tool & dev server   |
| Tailwind CSS     | v4      | Utility-first CSS         |
| Framer Motion    | ~12.x   | Animations                |
| React Router DOM | v7      | Client-side routing       |
| Lucide React     | latest  | Icons                     |
| Supabase         | v2      | Database & Auth backend   |

### Code Style

- Use **TypeScript** for all new files — no plain `.js` in `src/`.
- Prefer **functional components** with hooks.
- Use the global `Card` component (`src/components/ui/Card.tsx`) for all cards — it carries the site-wide neumorphic style automatically.
- Use `cn()` from `src/utils/cn.ts` for conditional class merging — don't concatenate class strings manually.
- Keep **section components** focused — one file per section, no business logic inside UI components.
- Remove unused imports before committing — `tsc --noEmit` will flag them as errors.

### Styling Rules

- All design tokens (colours, backgrounds) live as **CSS variables** in `src/styles/index.css` — use them, don't hardcode hex values.
- For new card-like UI, use `.neumorphic-card` and `.neumorphic-icon` CSS classes.
- Animations should use **Framer Motion** — avoid raw CSS `@keyframes` for component-level motion.
- The site uses a **dark-first** approach — always verify your changes look correct in **both dark and light mode** before submitting.

### Verify before submitting

```bash
# TypeScript check — must pass with 0 errors
npx tsc --noEmit

# Full production build — must complete successfully
npm run build
```

---

## 🐛 Reporting Bugs

Found a bug? [Open an issue](https://github.com/Utkrisht-Utpal/Cloud-Stack-Club/issues/new) and include:

- **A clear title** — e.g. *"Mobile CTA overlaps footer on iOS Safari"*
- **Steps to reproduce** — numbered list
- **Expected behaviour** vs **actual behaviour**
- **Screenshots or screen recording** — especially for UI bugs
- **Environment** — browser, OS, screen size

---

## ✨ Suggesting Features

Have an idea? [Open a feature request](https://github.com/Utkrisht-Utpal/Cloud-Stack-Club/issues/new) with the label `enhancement` and include:

- **Problem** — what gap does this fill?
- **Proposed solution** — describe the feature
- **Alternatives considered** — any other approaches you thought of?
- **Mockup or reference** — optional but very helpful

---

## 📬 Contact

Have questions not covered here?

- **GitHub Issues** — for bugs and feature requests
- **Club Email** — listed in the website's Contact section
- **LinkedIn / Instagram** — links in the website footer

---

<p align="center">
  Made with ❤️ by <strong>Utkrisht Utpal</strong> &amp; the Cloud Stack Club Community<br/>
  <em>Learn • Build • Deploy • Scale</em>
</p>
