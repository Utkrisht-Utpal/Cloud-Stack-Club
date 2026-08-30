# ☁️ Cloud Stack Club — Chandigarh University

> **Learn • Build • Deploy • Scale**

A modern, high-performance, responsive dark/light theme web application and complete administration management system for **Cloud Stack Club, Chandigarh University**. Built with React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Supabase PostgreSQL, Cloudflare Storage Gateway, and Lucide Icons. The application fuses design principles from Vercel, Linear, Framer, GitHub, and Apple with a sleek cloud-computing aesthetic.

---

## 🌐 Live Demo & Deployment

🔗 **Live Website**: [https://cloudstack-official.vercel.app/](https://cloudstack-official.vercel.app/)

---

## ✨ Key Features

### 🎨 User Interface & Experience
- 🌓 **Dual Theme Support**: Seamless Light & Dark mode (using rich dark navy `#070a12`) with automatic system preference detection and persistence.
- ☁️ **Cloud Computing Aesthetic**: Dynamic HTML5 canvas particle background, ambient radial gradient glow effects, floating cloud vectors, and glassmorphism.
- 📱 **Fully Responsive**: Optimized for Mobile, Tablet, Laptop, and Ultra-wide desktop screens with no horizontal overflow.
- 🚀 **Interactive Hero Section**: Animated text gradients, floating technology badges (AWS, Kubernetes, Docker, DevOps, Azure, React, Node.js), and real-time terminal visual status.
- 🎯 **About & Pillars**: Poster-inspired overview highlighting *Mission*, *Vision*, *Community*, *Innovation*, and *Learning*.
- 🛠️ **Domains & Tracks**: Detailed showcase of technical domains (*Cloud Computing*, *Full Stack Development*, *DevOps*, *Docker & Containers*, *Kubernetes*, *AI + Cloud*).
- 🌟 **Member Benefits**: Interactive cards covering hands-on technical workshops, peer mentorship, hackathons, and career networking.

---

### 📸 Event Photo Gallery (Google Photos–Style Responsive Engine)
- 🖼️ **Dynamic Justified Gallery Layout**:
  - Automatically measures intrinsic image dimensions (`naturalWidth` / `naturalHeight`) on-the-fly.
  - Dynamically calculates row heights and distributes widths to achieve a seamless, continuous justified layout resembling Google Photos & Apple Photos.
  - Strictly preserves original aspect ratios (**16:9 landscape**, **9:16 portrait**, **1:1 square**, **4:3**, and **panoramas**) with zero distortion and zero unwanted cropping.
- 📐 **Adaptive Portrait Boost**:
  - Automatically elevates row heights when portrait photos are present, ensuring vertical photos remain tall, crisp, and prominent without squishing.
- ⚡ **High-Performance 60–120 FPS Scrolling**:
  - Leverages `content-visibility: auto`, `contain-intrinsic-size`, async image decoding, and batched aspect ratio resolution to eliminate layout thrashing.
  - Native GPU hardware-accelerated transforms on photo hover.
- 🎴 **Unified Event Cards**:
  - Each event is encapsulated inside a cohesive parent card displaying category badges, event location, formatted dates (`DD-MM-YYYY`), live backend description, and all photos belonging to that event.
- 🔍 **Interactive Fullscreen Lightbox**:
  - Click any photo anywhere to launch the high-resolution lightbox viewer.
  - Supports keyboard navigation (`Left` / `Right` arrows, `Esc`), full image download, and subtle caption overlays.

---

### 📅 Events & Registration Engine
- 🎪 **Dynamic Event Showcase**: Real-time event cards with live Supabase database synchronization, category badges (*Hackathons*, *Ideathons*, *Workshops*, *Bootcamps*, *Competitions*), poster & brochure viewers.
- ⏰ **IST Deadline & Status Recalculation**: Universal event deadline enforcement according to Indian Standard Time (`Asia/Kolkata`, up to 23:59:59.999 IST).
- 👥 **Solo & Team Registrations**: Flexible registration workflows with custom team member limits, team leader assignments, and automated seat capacity checks.
- 🎫 **Automated Registration ID Generation**: Generates unique alphanumeric registration IDs (`REG-YYYYMMDD-XXXXXX`) with instantaneous database and local verification.
- 🔍 **Registration Status Lookup**: Self-service modal allowing participants to verify their event registration status using their University ID (UID) and Registration ID.
- 💬 **Event Feedback System**: Dedicated rating engine collecting event feedback, coordination ratings, engagement scores, and suggestions directly into Supabase.

---

### 🛡️ Full Admin Management Suite
- 🖼️ **Event Photo Gallery Management**:
  - Multi-photo upload with drag-and-drop support and incremental selection (add photos one by one or in batches).
  - Client-side & service-layer validation enforcing `< 1MB` file limits (PNG, JPG, JPEG, WEBP).
  - Real-time thumbnail preview chips with click-to-preview lightbox modal before upload.
  - Photo management cards with top-right Edit (caption) and Delete action buttons, and click-anywhere full preview.
  - Compact dual-container dashboard layout (`h-[385px]`) with smooth invisible scrollbars and default selection of the most recently passed event.
- 📋 **Membership Applications Workflow**:
  - Review, approve, or reject applicant submissions with live status updates.
  - Preview CUIMS verification documents directly inside an integrated viewer modal.
  - Smart re-application handling: previously inactive members automatically reactivate to `pending` status without duplicate errors.
- 👥 **Members & Hierarchy Directory**:
  - Search and filter active and pending members by Name, UID, Registration ID, or Department.
  - Assign club roles and core council status with real-time database updates.
  - Export comprehensive member directories to formatted PDF reports.
- 🏷️ **Roles CRUD & Member Popups**:
  - Create, edit, and delete club roles directly in Supabase with custom hierarchy order ranks (`display_order`) and scope descriptions.
  - Interactive `{count} active` pills opening dedicated popups showing all active members assigned to that role.
- 🎪 **Events & Content Management**:
  - Create and edit events with poster image and PDF schedule brochure uploads.
  - Configure registration windows, custom eligibility, team size bounds, and maximum participant caps.
  - View event registration rosters with participant search, team groupings, and direct Excel / PDF export.
- 📝 **Dynamic Form Builder**:
  - Build custom registration form fields (text, select, radio, checkbox, file) per event with automated schema validation.
- 📬 **Feedback & Inquiries Management**:
  - Manage contact inquiries and event feedback reviews with status management workflows.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Modern declarative UI component framework |
| **TypeScript** | Strict compile-time type safety across all services, components, and models |
| **Vite** | Next-generation frontend build tooling and lightning-fast HMR |
| **Tailwind CSS** | Utility-first CSS framework with native CSS variables and glassmorphism |
| **Supabase** | PostgreSQL database, Row-Level Security (RLS), and real-time APIs |
| **Cloudflare Workers & R2** | Scalable global object storage gateway for event photos, posters, PDFs, and documents |
| **Framer Motion** | Physics-based UI animations, modal transitions, and interactive controls |
| **React Router DOM v7** | Single Page Application (SPA) client-side routing |
| **Lucide Icons** | Consistent, modern vector iconography |
| **jsPDF & AutoTable** | Client-side dynamic PDF report and roster generation |
| **XLSX (SheetJS)** | Excel spreadsheet generation for event participant exports |

---

## 📁 Project Structure

```text
cloud-stack-club/
├── public/
│   ├── favicon.svg              # Custom Cloud Stack Club logo favicon
│   ├── cloudstack_preview.png   # OpenGraph / social media link preview
│   ├── robots.txt               # SEO crawler directives
│   └── sitemap.xml              # XML search sitemap
├── src/
│   ├── assets/
│   │   └── images/              # University logos and graphics
│   ├── components/
│   │   ├── admin/               # AdminDashboard, GalleryManagement, FormBuilder, RolesManagementModal
│   │   ├── common/              # Navbar, Footer, FloatingMobileCTA, JoinModal, EventAdModal
│   │   ├── gallery/             # GallerySection, JustifiedGallery (Google Photos engine), GalleryLightbox
│   │   ├── sections/            # Hero, About, WhatWeDo, WhyJoin, Events, Contact, Leadership
│   │   └── ui/                  # Button, Card, Modal, CustomSelect, ConfirmModal, Toast, ParticleCanvas
│   ├── constants/
│   │   ├── data.ts              # Static data, pillar descriptions, domain specifications
│   │   └── siteConfig.ts        # Club metadata, contact information, coordinator details
│   ├── context/
│   │   └── ThemeContext.tsx     # Light/Dark theme provider and persistence
│   ├── layouts/
│   │   └── MainLayout.tsx       # Global layout wrapper with Navbar, Background, and Footer
│   ├── pages/
│   │   ├── HomePage.tsx         # Main landing page
│   │   ├── AdminPage.tsx        # Protected administration portal
│   │   ├── GalleryPage.tsx      # Public event photo gallery
│   │   ├── TeamPage.tsx         # Executive team & member showcase
│   │   └── NotFoundPage.tsx     # Custom 404 page
│   ├── services/
│   │   ├── supabase.ts          # Supabase client & Cloudflare R2 gateway configuration
│   │   ├── events.ts            # Events CRUD, status synchronizer, and capacity management
│   │   ├── gallery.ts           # Event photo gallery service, R2 uploads, and photo CRUD
│   │   ├── members.ts           # Member onboarding, application review, and duplicate checks
│   │   ├── roles.ts             # Live database Role CRUD and hierarchy management
│   │   ├── registrations.ts     # Solo and team event registration engine
│   │   ├── registrationForms.ts # Dynamic form builder definitions and submissions
│   │   └── feedback.ts          # Event feedback & contact inquiry services
│   ├── styles/
│   │   └── index.css            # Tailwind CSS rules & custom aesthetic tokens
│   ├── types/
│   │   └── database.ts          # Full TypeScript schemas for Supabase tables and models
│   ├── utils/
│   │   ├── cn.ts                # Class merging utility (clsx + tailwind-merge)
│   │   └── exportDirectory.ts   # jsPDF report & member roster generators
│   ├── App.tsx                  # Root application router
│   └── main.tsx                 # React DOM mount point
├── supabase/
│   └── migrations/              # PostgreSQL schema definitions and RLS policies
├── index.html                   # HTML entrypoint with metadata and social tags
├── vite.config.ts               # Vite configuration and build optimizations
├── tsconfig.json                # TypeScript project compiler configuration
└── package.json                 # Project dependencies and script definitions
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher recommended)
- `npm` or `yarn` or `pnpm`

### Installation & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Utkrisht-Utpal/Cloud-Stack-Club.git
   cd Cloud-Stack-Club
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_STORAGE_GATEWAY_URL=https://your-cloudflare-worker.workers.dev
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for production**:
   ```bash
   npm run build
   ```
   The compiled production output will be generated in the `dist/` directory.

---

## 👥 Club Leadership & Coordinators

- **Faculty Coordinator**: Dr. Deepti Sharma
- **Co-Faculty Coordinator**: Prof. Navjot Singh
- **Secretary**: Lakshay Gosai
- **Joint Secretary**: Bani Kaur
- **Institution**: Chandigarh University

---

## 📄 License

This project is built and maintained for **Cloud Stack Club, Chandigarh University**.

Copyright © 2026 Cloud Stack Club. All rights reserved.
