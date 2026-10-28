# ☁️ Cloud Stack Club — Chandigarh University

> **Learn • Build • Deploy • Scale**

The official web platform and community management system for **Cloud Stack Club, Chandigarh University**. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, **Supabase PostgreSQL**, and **Cloudflare R2 CDN**.

The platform provides a comprehensive, high-performance experience for university students, event participants, club members, faculty coordinators, and student leaders.

---

## 🌐 Live Portal & Official Links

- 🔗 **Official Website**: [https://cloudstack-official.vercel.app/](https://cloudstack-official.vercel.app/)
- 🏛️ **Affiliation**: Chandigarh University, Mohali, Punjab, India
- 📧 **Official Inquiries**: [cloudstackclub@cumail.in](mailto:cloudstackclub@cumail.in)
- 💼 **LinkedIn**: [Cloud Stack Club](https://www.linkedin.com/in/cloud-stack-club-977987414/)
- 📸 **Instagram**: [@cloud_stackclub](https://www.instagram.com/cloud_stackclub?igsh=Z3l3dm1uamlsNms1)

---

## ✨ Complete Features & System Capabilities

### 🎨 1. User Interface & Visual Experience
- **Dual Theme Engine**: Seamless toggle between Dark Navy (`#020617`) and Light mode with automatic OS preference detection and instant persistence.
- **Cosmic Particle Canvas**: Custom HTML5 particle canvas background with glowing gradients and ambient cloud animations.
- **Interactive Cursor**: Physics-driven cosmic particle trail with auto-detection that disables on touch and mobile devices.
- **Top Reading Scroll Indicator**: Slim progress bar showing page reading depth.
- **Live Hanging & Mobile Notice Board**:
  - Desktop: Elegant hanging wooden-style notice board right below the navbar.
  - Mobile: Sleek upfront announcement pill with instant modal preview for urgent alerts and flash notices.
- **Dynamic Terminal & Tech Badges**: Interactive hero section featuring live terminal status emulation and technology badges (*AWS, Kubernetes, Docker, DevOps, Azure, React, Node.js, AI/ML*).
- **Interactive Multi-Mode Opening Reveal Screen**:
  - High-impact cinematic welcome animation displayed on initial entry (plays once per session with `sessionStorage` persistence and instant `ESC` skip).
  - **4 Switchable Reveal Styles**:
    1. *Futuristic Vault Doors*: Double hydraulic carbon blast doors with cyber circuit traces, central rotating security iris, and cluster boot HUD parting smoothly to reveal the website.
    2. *Map / Satellite Orbit Radar Zoom*: Holographic wireframe globe targeting Chandigarh University coordinates (`30.7688° N, 76.5754° E`) with altitude telemetry and hypersonic camera descent.
    3. *Cosmic Shutter / Iris Aperture*: 8-blade camera iris rotating centrifugally over an active interstellar nebula and glowing club emblem.
    4. *Cinematic Split Blinds*: Minimalist multi-panel alternating vertical blinds with neon laser seam and bold typographical presentation.
  - Interactive preview dock allowing live 1-click switching to try each style.
  - Replayable anytime via the Footer *"Replay Intro"* trigger or Claudyi Chatbot (`/intro` command).

---

### 🎪 2. Events Directory & Detail Pages
- **Events Directory (`/events`)**:
  - Filter by category (*Hackathons, Ideathons, Workshops, Bootcamps, Competitions, Expert Talks*).
  - Filter by lifecycle status (*Upcoming, Live / Ongoing, Past / Completed*).
  - Instant keyword search and relevance/date sorting.
- **Deep-Linked Event Briefing Pages (`/events/:slug`)**:
  - Real-time countdown clocks and registration status badges.
  - Interactive modal viewers for official poster artwork and PDF schedule brochures.
  - Markdown-rendered event rules, eligibility prerequisites, prize pools, and schedule timelines.
  - Organizer showcase highlighting faculty coordinators and student leads.
- **Featured Event Announcement Popup (Ad Modal)**:
  - Responsive high-impact popup spotlighting featured/active club events with live registration status pills, seat availability counters, date, time, venue, and full rich-text event descriptions.
  - 1-click transition directly into the Event Registration flow or past event feedback.
- **Solo & Team Registration Engine**:
  - Supports individual registrations and custom-sized team registrations (with leader and member roles).
  - Mandatory collection and verification of student credentials: **Full Name**, **Institutional / Personal Email**, **10-character University ID (UID)**, **10-digit Phone Number**, **Department / Branch**, **Academic Year**, and **Section / Group** across all registrants and teammates.
  - Instant automated registration number generation (`REG-YYYYMMDD-XXXXXX`).
  - Dynamic custom question support (text, dropdowns, multi-select, and file uploads).
  - Cloudflare Turnstile anti-bot security verification widget guarding public registration submissions.
  - Real-time seat capacity enforcement and automated registration window closing.
  - Official WhatsApp Group invite link presented on confirmation popup and dispatched in emails.
- **Self-Service Registration Lookup**: Students can look up their registration pass, check status, and view team rosters anytime using their UID.
- **Post-Event Reviews & Verified Feedback (`/events/:slug/feedback`)**: 
  - Collection of attendee ratings across event coordination, speaker clarity, technical depth, and suggestions.
  - **Zero-Trust 4-Way Verification Engine**: Cryptographic validation binding Registration ID, University ID, registered Email, and Phone number.
  - **Granular Bidirectional Diagnostics**: Pinpoints the exact field mismatch (e.g. *"Mobile number does not match registered phone"* or *"University ID found, but Registration ID does not match"*) rather than generic errors.
  - **Foolproof Registration ID Formatting**: Resilient on-the-fly input normalization (`REG-YYYYMMDD-XXXXXX`) accepting inputs with or without prefixes, spaces, or hyphens.

---

### 📸 3. Dynamic Photo Gallery (`/gallery`)
- **Justified Aspect-Ratio Engine**: Smart layout inspired by Google Photos and Apple Photos that computes natural aspect ratios on the fly.
- **Zero-Crop Preservation**: Preserves 16:9 landscape, 9:16 vertical portrait, 1:1 square, 4:3, and panoramic photos without unwanted cropping.
- **Interactive Lightbox**: Fullscreen high-resolution photo viewer with keyboard navigation (`Left`, `Right`, `Esc`) and instant one-click downloads.
- **Admin Photo Ordering Controls**: On-card interactive reordering arrows (`◀` / `▶`) and sequence badges (`#1`, `#2`, `#3`) inside Admin Gallery Management for on-the-fly display ordering without page reloads.

---

### 💬 4. Event Testimonials Engine
- **Visitor Showcase**: Authentic participant reviews, quotes, and competition experiences.
- **Author Badges**: Author credentials, academic department/position, and event badges.
- **Strict Display Ordering**: Rendered in custom sequence defined by club administrators.

---

### 👥 5. Executive Leadership Directory (`/team`)
- **Leadership Roster**: Dedicated profiles for Faculty Coordinators, Student Secretaries, Technical Domain Leads, and Core Members.
- **Social Portfolios**: 1-click links to LinkedIn, GitHub, Twitter/X, Instagram, and personal portfolios.

---

### 🤖 6. 24/7 AI Chatbot Assistant (Claudyi)
- **High-Performance Floating Companion**: Always-accessible student widget providing instant answers regarding upcoming events, registration steps, eligibility, domains, and leadership.
- **Dynamic Mobile & Desktop Responsiveness**: Adaptive centered window (`inset-x-3`) on mobile screens with dynamic viewport height (`100dvh`), iOS Safari auto-zoom prevention, and desktop bottom-right alignment.
- **Live Supabase Knowledge Base Synchronization**: Answers are matched against live administrative Knowledge Base FAQs with fallback intent scoring.
- **Comprehensive Dual-Step Membership Guide**: Step-by-step instructions guiding students through both **CUIMS** registration (with proof screenshot) and the **Club Website** application.
- **Global Modal Interoperability**: In-chat action buttons and links (`[Join Club](/join)`, `[Discrepancy Form](/discrepancy)`) dynamically open the target modals from anywhere in the app without page refreshes.
- **Snappy Response Engine & Keyboard Shortcuts**: Sub-100ms response rendering, smooth auto-scrolling, touch-tactile feedback, and `Escape` key close shortcut.
- **Interactive Easter Egg**: Built-in mini-game playable directly inside the widget (`/tetris`).

---

### 📝 7. Membership Onboarding & Student Support
- **Online Application Portal (`/join`, `/apply`)**: Multi-step onboarding for students to join technical tracks (*Cloud Computing, DevOps, Full Stack, Containerization, AI/ML*).
- **Embedded Chatbot Support**: Contextual *"Having Problem Joining our club? Ask our chatbot"* shortcut embedded directly beneath the submit button.
- **Proof Verification**: Secure upload of student ID/profile verification documents.
- **Smart Renewal & Reactivation**: Returning members automatically reactivate to pending review without duplicate key errors.
- **Student Grievance & Discrepancy Portal (`/discrepancy`)**: Dedicated portal for students to resolve UID mismatches, CUIMS duplicate club memberships, profile updates, and registration queries.

---

### ✉️ 8. Automated Transactional Email System
- **Automated Dispatches**: Instant emails triggered for membership approvals, rejections with constructive feedback, contact inquiry resolutions, and event broadcast announcements.
- **Registration Passes**: Automatic confirmation emails with event details, UID, pass number, and WhatsApp community links for individuals and team leaders.
- **Dual Deliverability Themes**:
  - **Institutional Theme**: High-contrast dark theme optimized specifically for `@cuchd.in` and `@cumail.in` academic mailboxes.
  - **Universal Visual Theme**: Modern branded gradient layouts for Gmail, Outlook, and external email providers.
- **Email Design Studio**: 9 customizable header layout presets, interactive color palette customizer, and live desktop/mobile preview pane.
- **Email Audit Logs**: Full delivery logs recording recipient emails, timestamps, categories, and delivery statuses.

---

### 🛡️ 9. Comprehensive 9-Tab Administration Suite (`/admin`)
A protected dashboard for authorized club administrators:

| # | Admin Tab | Capabilities |
| :--- | :--- | :--- |
| **1** | **Members** | Review applications, inspect verification proofs, approve/reject with email triggers, assign roles, export member directory to Excel & PDF. |
| **2** | **Events** | Create/edit events, upload posters & PDF schedules, toggle registration windows, broadcast announcements, view participant rosters with search & export. |
| **3** | **Forms** | Dynamic event form builder configuring custom input fields (text, select, radio, checkbox, file upload) per event with full multi-question support. |
| **4** | **Feedbacks** | Centralized dashboard for contact inquiries and event feedback submissions with status resolution workflow. |
| **5** | **Gallery** | Multi-photo batch upload, file size validation, inline caption editing, position indicator badges, and 1-click reorder arrows (`◀` / `▶`). |
| **6** | **Team** | Manage leadership directory, crop headshots with `ImageCropModal`, and assign role hierarchy ranks. |
| **7** | **Emails** | Audit delivery logs, launch the Email Design Studio, and customize institutional email templates. |
| **8** | **Chatbot** | Full FAQ Knowledge Base CRUD manager to update bot answers and train question patterns in real time. |
| **9** | **Testimonials** | Add testimonials, live preview cards, duplicate order detection, and 1-click atomic swap reordering (`▲`/`▼`). |

#### Additional Admin Tools:
- **Discrepancy Submissions Management**: Dedicated modal to review and resolve student grievances and CUIMS registration discrepancies.
- **Notice Manager**: Publish real-time flash banners, tickers, and urgent alerts.
- **Role Hierarchy Manager**: Configure club organizational roles, hierarchy display ranks, and member counts.
- **Participant Roster Export**: 1-click export of complete attendee data (including department, academic year, section/group, team hierarchy, and custom form answers) into formatted **Excel (`.xlsx`)** and **PDF** reports.
- **Inactivity Protection**: Automatic session termination after extended administrative inactivity.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | **React 19** with **TypeScript** |
| **Build & Tooling** | **Vite 5** |
| **Styling & Styling Engine** | **Tailwind CSS v4** |
| **Animations & Transitions** | **Framer Motion 12** |
| **Routing** | **React Router DOM v7** |
| **Security & Bot Protection** | **Cloudflare Turnstile** |
| **Iconography** | **Lucide React** |
| **Database & Realtime** | **Supabase (PostgreSQL 15+)** |
| **Media Storage & CDN** | **Cloudflare Workers & Cloudflare R2** |
| **Spreadsheet & PDF Export**| **SheetJS (XLSX)**, **jsPDF & AutoTable** |
| **Deployment** | **Vercel Edge Network** |

---

## 📂 Repository Structure

```
Cloud-Stack-Club/
├── public/                     # Static media, icons, and branding assets
├── src/
│   ├── components/             # Reusable modular UI components
│   │   ├── admin/              # Comprehensive 9-Tab Admin Suite & editors
│   │   ├── chatbot/            # Claudyi AI companion & embedded interactive widgets
│   │   ├── common/             # Global modals (Join, Register, Discrepancy, Feedback)
│   │   └── home/               # Landing page hero, notice boards, and feature sections
│   ├── layouts/                # Root page shell and layout wrappers
│   ├── pages/                  # Top-level route pages (Home, Events, Team, Gallery, etc.)
│   ├── services/               # Supabase client, RPC calls, Cloudflare worker proxy, & AI NLP
│   ├── types/                  # Strict TypeScript schemas and interfaces
│   └── utils/                  # Data transformers, validation, XLSX/PDF exporters
└── supabase/                   # Schema migrations, security RLS policies, and database RPCs
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** `v18.0.0` or higher (Node.js 20+ recommended)
- **npm**, **pnpm**, or **yarn**

### Quick Start

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Utkrisht-Utpal/Cloud-Stack-Club.git
   cd Cloud-Stack-Club
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_MEDIA_WORKER_URL=your-cloudflare-worker-url
   VITE_R2_PUBLIC_URL=your-r2-public-bucket-url
   VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
   ```

4. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 👥 Club Leadership

### Faculty Coordinators
- **Faculty Coordinator**: Dr. Deepti Sharma
- **Co-Faculty Coordinator**: Prof. Navjot Singh

### Student Executive Council
- **Secretary**: Lakshya Gosai
- **Joint Secretary**: Bani Kaur

---

## 📄 License & Copyright

Designed and developed for **Cloud Stack Club, Chandigarh University**.  
Copyright © 2026 Cloud Stack Club. All rights reserved.
