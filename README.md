# ☁️ Cloud Stack Club — Chandigarh University

> **Learn • Build • Deploy • Scale**

A state-of-the-art, high-performance web portal and comprehensive administration management system for **Cloud Stack Club, Chandigarh University**. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, **Supabase PostgreSQL**, **Cloudflare Workers & R2 Storage CDN**, and **Lucide Icons**. 

The platform merges modern design principles from Vercel, Linear, Framer, GitHub, and Apple with a high-tech cloud computing aesthetic, providing a seamless experience for students, participants, faculty coordinators, and club administrators.

---

## 🌐 Live Portal & Deployment

- 🔗 **Production Website**: [https://cloudstack-official.vercel.app/](https://cloudstack-official.vercel.app/)
- 🏛️ **Affiliation**: Chandigarh University, Mohali, Punjab, India
- 📧 **Official Inquiries**: `cloudstackclub@cumail.in`

---

## ✨ Key Features & System Modules

### 🎨 1. User Interface & Cloud Design System
- 🌓 **Dual Theme Engine**: Seamless toggle between rich dark navy (`#020617`) and crisp slate light mode with automatic system preference detection and `localStorage` persistence.
- ☁️ **Cosmic Cloud Background**: Custom HTML5 particle canvas generating dynamic interactive particles, glowing radial gradients, and floating cloud vector animations.
- 🖱️ **Cosmic Interactive Cursor**: Physics-driven particle trail cursor with auto-detection for touch/mobile devices (`CustomCursor`).
- 📏 **Top Reading Scroll Indicator**: Ultra-thin progress indicator (`ScrollProgress`) paired with intelligent fallback scrollbar restoration (`useScrollbarFallback`).
- 📱 **Adaptive Responsiveness**: Meticulously styled for mobile, tablet, laptop, and ultra-wide desktop viewports with zero horizontal clipping.
- 🚀 **Interactive Hero Section**: Dynamic text gradient animations, live technology badges (*AWS, Kubernetes, Docker, DevOps, Azure, React, Node.js*), and real-time terminal status emulator.
- 🎯 **Club Pillars & Tracks**: Comprehensive showcase covering *Cloud Computing*, *Full Stack Development*, *DevOps*, *Docker & Containers*, *Kubernetes*, and *AI + Cloud*.

---

### 📅 2. Events Directory, Detail Pages & Registration
- 🎪 **Events Directory (`/events`)**:
  - Filter events by category (*Hackathons*, *Ideathons*, *Workshops*, *Bootcamps*, *Competitions*, *Expert Talks*).
  - Categorize by lifecycle status (*Upcoming*, *Live / Ongoing*, *Past / Completed*).
  - Instant text search and sorting by relevance or date.
- 📄 **Deep-Linked Event Detail Pages (`/events/:slug`)**:
  - Dedicated event briefing pages with live countdown clocks and deadline badges.
  - Interactive modal viewers for official poster artwork and PDF schedule brochures.
  - Comprehensive event rules, eligibility prerequisites, prize pools, and schedule timelines.
  - Dedicated showcase for event faculty coordinators, student leads, and organizers.
- 👥 **Solo & Team Registration Engine (`/events/:slug/register`)**:
  - Configurable team bounds (minimum and maximum team members) with team leader assignments.
  - Real-time seat capacity checks and automated registration window enforcement.
  - Automatic alphanumeric registration ID generation (`REG-YYYYMMDD-XXXXXX`).
  - Strict client and database validation preventing duplicate registrations (UID, email, phone).
- 🔍 **Self-Service Registration Lookup**:
  - Direct student verification modal allowing participants to confirm registration status and team rosters using their University ID (UID) and Registration ID.
- 💬 **Event Feedback & Review Engine (`/events/:slug/feedback`)**:
  - Post-event review collection tracking ratings across event coordination, technical content, speaker clarity, and student suggestions.

---

### 💬 3. Event Testimonials Engine (Public & Admin)
- 🌟 **Public Visitor Showcase (`#testimonials`)**:
  - Responsive event-specific cards featuring authentic student and participant quotes.
  - Displays event badge, author name, and student department/position (`author_position`) in clean typography.
  - Strictly rendered in custom ascending order sequence (`display_order ASC`).
- 🛡️ **Full Admin Management Suite**:
  - **Dual-Pane Dashboard Layout**: Left side Add Testimonial form + right side Live Preview cards.
  - **Equal-Height Container Matching**: Dynamic `ResizeObserver` syncs the height of both containers to end at the exact same baseline ("same last point").
  - **Themed Custom Scrollbar**: Preview list smoothly scrolls within container bounds using the website's dark/light scrollbar tokens.
  - **Live Duplicate Detection & Auto-Fill**: Real-time warning alert if an order number is already taken by another author, with a 1-click `Use #{next}` button auto-filling the lowest available integer.
  - **1-Click Atomic Reordering**: `Move Up` (`▲`) and `Move Down` (`▼`) controls that safely swap display orders between adjacent cards without temporary uniqueness collisions.
  - **Database Integrity**: Protected in PostgreSQL via `UNIQUE INDEX idx_testimonials_unique_active_order` on active testimonials.
  - **Zero Refresh Latency**: Local state updates immediately upon creation, deletion, or reordering with zero manual browser reloads required.

---

### 📸 4. Event Photo Gallery (Google Photos–Style Responsive Engine)
- 🖼️ **Dynamic Justified Gallery Layout (`/gallery`)**:
  - Calculates intrinsic aspect ratios (`naturalWidth` / `naturalHeight`) on-the-fly.
  - Dynamically computes row heights and distributes item widths to create a continuous, justified layout resembling Google Photos and Apple Photos.
  - Strictly preserves original image proportions (**16:9 landscape**, **9:16 portrait**, **1:1 square**, **4:3**, and **panoramas**) with zero unwanted cropping or stretching.
- 📐 **Adaptive Portrait Boost**:
  - Automatically elevates container row height when vertical portrait photos are detected, ensuring tall photos remain crisp and prominent.
- ⚡ **High-Performance 60–120 FPS Rendering**:
  - Built with `content-visibility: auto`, `contain-intrinsic-size`, async image decoding, and batched aspect resolution to eliminate layout shifts.
- 🔍 **Interactive Fullscreen Lightbox**:
  - High-resolution modal viewer with keyboard navigation (`Left`, `Right`, `Esc`), full-resolution image downloads, and subtle caption overlays.
- 🛠️ **Admin Multi-Photo Manager**:
  - Drag-and-drop batch photo uploads with client-side file signature verification and `< 1MB` file size limits (PNG, JPG, JPEG, WEBP).
  - Real-time thumbnail preview chips with lightbox inspection prior to upload.
  - Inline caption editing and 1-click photo deletion.

---

### 🤖 5. Cloud Stack AI Chatbot Assistant
- 💬 **Visitor-Facing Floating Widget (`ChatbotWidget`)**:
  - Always-accessible floating assistant on all public pages.
  - Provides instant answers to common student inquiries regarding upcoming events, registration steps, club eligibility, workshop topics, and contact details.
  - Built-in quick suggestion prompts and rich markdown formatting support.
- 📚 **Admin Chatbot FAQs Manager (`ChatbotManagement`)**:
  - Full CRUD interface for chatbot knowledge base entries.
  - Categorize questions, configure keywords, and update answers in real time without code redeployments.

---

### ✉️ 6. Automated Email Notification System & Email Studio
- 📨 **Transactional Email Triggers**:
  - Instant automated emails dispatched for member application approvals, rejections with constructive feedback, contact inquiry follow-ups, and event feedback notifications.
- 🎨 **Email Design Studio (`EmailDesignStudioModal`)**:
  - Visual email template designer featuring Chandigarh University & Cloud Stack Club institutional branding.
  - Custom color palette customization via interactive `ColorWheelPicker`.
  - Live responsive HTML desktop & mobile preview pane.
- 📋 **Institutional Email Templates**:
  - Pre-built institutional email templates with dynamic placeholder variables (`{MEMBER_NAME}`, `{EVENT_NAME}`, `{REGISTRATION_ID}`, `{DEPARTMENT}`).
  - Customizable club notice and announcement headers.
- 📊 **Email Logs Dashboard (`EmailLogsManagement`)**:
  - Centralized audit trail recording delivery status, recipients, timestamps, and error logs for all outgoing club communications.

---

### 👥 7. Executive Team & Leadership Directory
- 🌟 **Public Team Page (`/team`)**:
  - Highlighting Faculty Coordinators, Executive Council Secretaries, Domain Leads, and Core Members.
  - Profile cards featuring designated club roles, academic year, department, and custom biographies.
  - Direct links to professional profiles (**LinkedIn**, **GitHub**, **Twitter / X**, **Instagram**, **Personal Portfolio**).
- 🛠️ **Team Media Management (`TeamMediaManagement`)**:
  - Add, update, and manage leadership directory records.
  - Integrated `ImageCropModal` ensuring profile headshots maintain consistent aspect ratios before publishing.

---

### 📝 8. Membership Onboarding & Discrepancy Resolution
- 📋 **Membership Application Workflow (`/join`, `/apply`)**:
  - Multi-step student onboarding form capturing academic details, department, technical interests, and motivation.
  - Verification document upload (CUIMS profile proof) directly to Cloudflare R2 object storage.
  - Smart re-application handling: previously inactive members automatically reactivate to `pending` status without duplicate key errors.
- ⚠️ **Student Discrepancy & Grievance Portal (`/discrepancy`, `/query`)**:
  - Dedicated self-service modal for resolving student credential mismatches, UID discrepancies, or registration issues.
  - Admin Discrepancy Management Modal (`DiscrepancyManagementModal`) allowing administrators to review, track, and resolve open student inquiries.

---

### 🛡️ 9. Comprehensive 9-Tab Administration Suite (`/admin`)

The protected administration portal provides 9 dedicated management tabs and auxiliary tools:

| # | Admin Tab | Core Capabilities |
| :---: | :--- | :--- |
| **1** | **Members** | Review applications, preview CUIMS proof documents, approve/reject with email triggers, assign roles, export member directories to Excel & PDF. |
| **2** | **Events** | Create and edit events, configure registration windows and team limits, upload posters & PDF brochures, view registration rosters, trigger broadcast announcements. |
| **3** | **Forms** | Dynamic Event Form Builder supporting custom input fields (text, select, radio, checkbox, file upload) per event. |
| **4** | **Feedbacks** | Centralized dashboard for contact inquiries and event feedback submissions with status management (`pending`, `in-progress`, `resolved`). |
| **5** | **Gallery** | Multi-photo drag-and-drop batch upload, file signature and size validation, photo caption editing, and gallery item deletion. |
| **6** | **Team** | Manage executive council members, upload and crop headshots, assign role hierarchy ranks, and manage social media links. |
| **7** | **Emails** | Monitor outgoing email delivery logs, launch the Email Design Studio, and edit institutional email templates. |
| **8** | **Chatbot** | Manage FAQ knowledge base entries, train question patterns, and manage chatbot answers. |
| **9** | **Testimonials** | Add event testimonials, real-time live preview cards, live duplicate order detection, 1-click atomic reordering (`▲`/`▼`), and deletion. |

#### Additional Admin Capabilities:
- 📢 **Notice Management Modal (`NoticeManagementModal`)**: Publish urgent flash alerts, website announcement banners, and club tickers.
- ⚖️ **Roles Hierarchy Management (`RolesManagementModal`)**: Dynamic database Role CRUD with custom hierarchy display ranks (`display_order`) and member count popups.
- 📜 **Event Rules Builder (`EventRulesModal`)**: Structured markdown rules and guideline authoring per event.
- 🔒 **Inactivity Auto-Logout**: Automatic secure session termination after extended administrative inactivity.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** (`react`, `react-dom`) | Modern component architecture with latest hooks and concurrent rendering |
| **Language** | **TypeScript 5+** | Full end-to-end static typing across all models, components, and services |
| **Build & Tooling** | **Vite 5** | Lightning-fast development server with instant Hot Module Replacement (HMR) |
| **Styling & CSS** | **Tailwind CSS v4** (`@tailwindcss/vite`) | Next-generation utility-first styling engine with native CSS variables |
| **Animations** | **Framer Motion 12** | Physics-based micro-interactions, modal transitions, and layout animations |
| **Routing** | **React Router DOM v7** | Single Page Application (SPA) client-side routing with deep-link support |
| **Icons** | **Lucide React** | Clean, modern vector iconography |
| **Database & Auth** | **Supabase (PostgreSQL 15+)** | Cloud-native relational database, Row-Level Security (RLS), and real-time triggers |
| **Media Storage & CDN** | **Cloudflare Workers & R2** | Global edge object storage gateway for event photos, brochures, and documents |
| **Document Export** | **jsPDF & AutoTable** | Client-side dynamic PDF report and formatted roster generation |
| **Spreadsheet Export** | **XLSX (SheetJS)** | Native Excel (.xlsx) participant roster export |
| **Performance & Analytics**| **Vercel Analytics & Speed Insights** | Real-time Core Web Vitals tracking and visitor traffic metrics |
| **Code Quality** | **Oxlint** | High-performance linter ensuring code quality and strict standards |

---

## 📁 Project Structure

```text
cloud-stack-club/
├── public/
│   ├── favicon.svg                  # Cloud Stack Club logo vector favicon
│   ├── cloudstack_preview.png       # OpenGraph / social preview image
│   ├── robots.txt                   # Search engine crawl directives
│   └── sitemap.xml                  # XML site index
├── src/
│   ├── assets/
│   │   └── images/                  # University & club logos, graphics
│   ├── components/
│   │   ├── admin/                   # Complete Admin Suite
│   │   │   ├── AdminDashboard.tsx           # Main 9-tab administration dashboard
│   │   │   ├── AdminLoginModal.tsx          # Secure admin credential login modal
│   │   │   ├── BroadcastEventModal.tsx      # Club-wide event broadcast modal
│   │   │   ├── ChatbotManagement.tsx        # FAQ knowledge base management tab
│   │   │   ├── ColorWheelPicker.tsx         # Color picker for email designer
│   │   │   ├── DiscrepancyManagementModal.tsx # Student inquiry resolution portal
│   │   │   ├── EmailDesignStudioModal.tsx   # Visual HTML email designer
│   │   │   ├── EmailLogsManagement.tsx      # Outgoing email delivery logs tab
│   │   │   ├── EmailTemplatesModal.tsx      # Institutional email templates modal
│   │   │   ├── EventFormBuilder.tsx         # Dynamic custom registration form builder
│   │   │   ├── EventPdfModal.tsx            # Event schedule brochure PDF viewer
│   │   │   ├── EventPosterModal.tsx         # Fullscreen poster preview modal
│   │   │   ├── EventRulesModal.tsx          # Event rules and guidelines builder
│   │   │   ├── GalleryManagement.tsx        # Event photo multi-upload and curation tab
│   │   │   ├── ImageCropModal.tsx           # Profile photo cropping tool
│   │   │   ├── ManageRoleModal.tsx          # Single-member role assignment modal
│   │   │   ├── NoticeManagementModal.tsx    # Flash notices & announcements modal
│   │   │   ├── RejectMemberModal.tsx        # Application rejection feedback modal
│   │   │   ├── RolesManagementModal.tsx     # Role hierarchy CRUD and active pills
│   │   │   ├── TeamMediaManagement.tsx      # Executive team directory management tab
│   │   │   ├── TestimonialsManagement.tsx   # Add form + live preview + reordering tab
│   │   │   ├── UpdateFeedbackStatusModal.tsx # Feedback review resolution modal
│   │   │   ├── VerificationDocModal.tsx     # CUIMS verification document viewer
│   │   │   └── ViewRegistrationsModal.tsx   # Event participant roster & export modal
│   │   ├── chatbot/
│   │   │   └── ChatbotWidget.tsx            # Floating AI assistant widget
│   │   ├── common/                  # Shared site-wide components
│   │   │   ├── DiscrepancyModal.tsx         # Student credential grievance modal
│   │   │   ├── ErrorPopupModal.tsx          # Global error feedback dialog
│   │   │   ├── EventAdModal.tsx             # Featured upcoming event announcement modal
│   │   │   ├── EventFeedbackModal.tsx       # Event review submission dialog
│   │   │   ├── EventRegisterModal.tsx       # Solo & team event registration modal
│   │   │   ├── FloatingMobileCTA.tsx        # Responsive mobile floating join button
│   │   │   ├── Footer.tsx                   # Site footer with university links & socials
│   │   │   ├── JoinModal.tsx                # Membership application modal
│   │   │   ├── LaunchCelebration.tsx        # Confetti celebration trigger
│   │   │   ├── Navbar.tsx                   # Responsive sticky navbar with theme switcher
│   │   │   ├── NoticeDetailModal.tsx        # Full notice view modal
│   │   │   ├── ScrollToTop.tsx              # Route change scroll position reset
│   │   │   └── TurnstileWidget.tsx          # Cloudflare Turnstile anti-bot challenge
│   │   ├── gallery/                 # Google Photos justified gallery engine
│   │   │   ├── GalleryLightbox.tsx          # Fullscreen interactive photo viewer
│   │   │   ├── GallerySection.tsx           # Event photo showcase container
│   │   │   └── JustifiedGallery.tsx         # Dynamic aspect-ratio row layout engine
│   │   ├── sections/                # Main landing page content sections
│   │   │   ├── AboutSection.tsx             # Club mission, vision, and values
│   │   │   ├── ContactSection.tsx           # Contact form and coordination details
│   │   │   ├── EventsSection.tsx            # Live event cards showcase
│   │   │   ├── HeroSection.tsx              # Hero banner with terminal and particle canvas
│   │   │   ├── TestimonialsSection.tsx      # Visitor testimonials carousel/grid
│   │   │   ├── WhatWeDoSection.tsx          # Technical tracks and domains
│   │   │   └── WhyJoinSection.tsx           # Member perks and opportunities
│   │   ├── team/
│   │   │   └── TeamSection.tsx              # Executive leadership and member showcase
│   │   └── ui/                      # Reusable atom components
│   │       ├── AlertModal.tsx               # Informational alert dialog
│   │       ├── Button.tsx                   # Themed primary/secondary/ghost buttons
│   │       ├── Card.tsx                     # Glassmorphic container card
│   │       ├── CloudBackground.tsx          # HTML5 particle canvas background
│   │       ├── ClubLogo.tsx                 # Official Club logo component
│   │       ├── ConfirmModal.tsx             # Action confirmation modal
│   │       ├── CULogo.tsx                   # Official Chandigarh University logo
│   │       ├── CustomCheckbox.tsx           # Accessible custom checkbox control
│   │       ├── CustomCursor.tsx             # Interactive cosmic particle cursor
│   │       ├── CustomSelect.tsx             # Styled select dropdown with badges & icons
│   │       ├── DatePicker.tsx               # Custom calendar date selector
│   │       ├── ErrorBoundary.tsx            # React runtime error boundary
│   │       ├── Modal.tsx                    # Accessible portal modal wrapper
│   │       ├── ScrollProgress.tsx           # Reading progress bar
│   │       ├── SectionTitle.tsx             # Section header with gradient accents
│   │       ├── SocialIcons.tsx              # Social brand vector icons
│   │       ├── TimePicker.tsx               # Custom time selection component
│   │       └── Toast.tsx                    # Ephemeral notification toast manager
│   ├── constants/
│   │   ├── data.ts                  # Static domain definitions, pillars, and tracks
│   │   └── siteConfig.ts            # Club metadata, leadership names, and social URLs
│   ├── context/
│   │   ├── AdminAuthContext.tsx     # Admin authentication state & session persistence
│   │   └── ThemeContext.tsx         # Dark/Light theme provider and persistence
│   ├── layouts/
│   │   └── MainLayout.tsx           # Root layout wrapper with Navbar, Modals, Footer
│   ├── lib/
│   │   ├── fileValidation.ts        # Client-side magic number file signature checker
│   │   ├── r2Storage.ts             # Cloudflare Workers & R2 upload and delete APIs
│   │   └── supabase.ts              # Supabase PostgreSQL client initialization
│   ├── pages/
│   │   ├── AdminPage.tsx            # Admin dashboard entrypoint
│   │   ├── EventDetailPage.tsx      # Comprehensive deep-linked event page
│   │   ├── EventsDirectoryPage.tsx  # Full events catalogue with search & filters
│   │   ├── GalleryPage.tsx          # Public Google Photos-style event gallery
│   │   ├── HomePage.tsx             # Landing page aggregating all core sections
│   │   ├── NotFoundPage.tsx         # Custom 404 page with navigation recovery
│   │   └── TeamPage.tsx             # Executive leadership directory page
│   ├── services/                    # Data access and service integration layer
│   │   ├── chatbot.ts               # Chatbot Q&A matching and knowledge base service
│   │   ├── discrepancies.ts         # Student grievance and discrepancy service
│   │   ├── email.ts                 # Transactional email dispatcher via Worker API
│   │   ├── emailTemplates.ts        # Institutional HTML email template engine
│   │   ├── events.ts                # Event CRUD, status engine, and capacity tracking
│   │   ├── feedback.ts              # Contact inquiries and event feedback service
│   │   ├── gallery.ts               # Event photo gallery service with R2 uploads
│   │   ├── members.ts               # Membership application and directory management
│   │   ├── notices.ts               # Flash alerts and announcement tickers service
│   │   ├── registrationForms.ts     # Dynamic form builder schema and submission service
│   │   ├── registrations.ts         # Solo/team registration and verification service
│   │   ├── roles.ts                 # Dynamic role hierarchy CRUD service
│   │   ├── supabase.ts              # Supabase client helper utilities
│   │   └── testimonials.ts          # Testimonial CRUD, ordering & atomic swap service
│   ├── styles/
│   │   └── index.css                # Tailwind CSS imports & custom aesthetic design tokens
│   ├── types/
│   │   ├── database.ts              # TypeScript interfaces for all Supabase tables
│   │   ├── email.ts                 # Email payload and options interfaces
│   │   ├── emailTemplate.ts         # Email template definition interfaces
│   │   └── index.ts                 # Shared application type definitions
│   ├── utils/
│   │   ├── cn.ts                    # Class name merger (clsx + tailwind-merge)
│   │   ├── exportDirectory.ts       # jsPDF and SheetJS Excel report generators
│   │   ├── formatters.ts            # Date, IST time, and currency formatters
│   │   ├── lazyWithRetry.ts         # Resilient code-splitting loader with auto-retry
│   │   ├── rulesFormatting.ts       # Markdown parsing for event guidelines
│   │   ├── slug.ts                  # URL-safe slug generator
│   │   ├── useScrollbarFallback.ts  # Fallback scrollbar recovery hook
│   │   └── uuid.ts                  # RFC4122 compliant UUID v4 generator
│   ├── App.tsx                      # Main application route configurations
│   └── main.tsx                     # React DOM entrypoint
├── supabase/
│   └── migrations/                  # 65+ PostgreSQL schema migrations & RLS policies
├── index.html                       # HTML5 entrypoint with SEO meta tags
├── vite.config.ts                   # Vite build configuration and chunk optimization
├── tsconfig.json                    # TypeScript compiler configuration
└── package.json                     # Project dependencies, scripts, and versioning
```

---

## 🗄️ Database Architecture & Migrations

The database is built on **PostgreSQL** hosted via **Supabase**, secured by **Row-Level Security (RLS)** policies, stored procedures, and atomic transaction functions. Over 65 versioned migrations reside under `supabase/migrations/`:

### Core Database Tables
- **`members`**: Club member directory, academic UIDs, department, academic year, approval statuses (`pending`, `approved`, `rejected`, `inactive`), and assigned roles.
- **`events`**: Event records, titles, slugs, descriptions, dates, IST registration windows, venue, capacity limits, team bounds, drive URLs, poster URLs, and PDF brochure URLs.
- **`event_registrations`**: Solo and team participant submissions, registration IDs (`REG-YYYYMMDD-XXXXXX`), leader info, member arrays, and attendance status.
- **`event_registration_forms`**: Dynamic form schemas configuring custom registration fields per event.
- **`event_gallery`**: Event photo records, Cloudflare R2 image keys, captions, display order, and upload timestamps.
- **`testimonials`**: Event testimonial quotes, author names, department/position, event associations, and unique ascending display order (`idx_testimonials_unique_active_order`).
- **`contact_feedbacks`**: General visitor contact messages, email inquiries, and administrative resolution statuses.
- **`event_feedbacks`**: Star ratings, coordination scores, and qualitative suggestions per event.
- **`roles`**: Club hierarchy titles, display ranks (`display_order`), and permission scopes.
- **`notices`**: Urgent announcement banners, tickers, active date ranges, and priority ranks.
- **`discrepancies`**: Student grievance submissions for credential or registration resolution.
- **`chatbot_faqs`**: Knowledge base entries, question variations, and bot response pairs.
- **`email_logs`**: Audit log of sent transactional emails, recipient addresses, templates, and delivery timestamps.

---

## ⚙️ Environment Variables & Security

Create a `.env` file in the project root based on `.env.example`:

```env
# =============================================================================
# CLOUD STACK CLUB — CLIENT ENVIRONMENT VARIABLES (.env)
# =============================================================================

# Supabase Public API Configuration (Safe for Client)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudflare Media Worker & R2 CDN (Safe for Client)
VITE_MEDIA_WORKER_URL=https://your-media-api.workers.dev
VITE_R2_PUBLIC_URL=https://pub-your-r2-id.r2.dev

# Cloudflare Turnstile Anti-Bot Challenge (Optional)
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

### 🔒 Security Principles
1. **Client Isolation**: Variables prefixed with `VITE_` are compiled into the client bundle. Private backend secrets, database `service_role` keys, or Cloudflare master API tokens are **never** committed or stored in client-side `.env` files.
2. **Row-Level Security (RLS)**: PostgreSQL Row-Level Security policies strictly enforce data access at the database level.
3. **Edge Worker Verification**: Cloudflare Workers verify authorization headers and validate uploaded file signatures before writing media to Cloudflare R2 buckets.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js** `v18.0.0` or higher (Node.js 20+ recommended)
- **npm**, **pnpm**, or **yarn**

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Utkrisht-Utpal/Cloud-Stack-Club.git
   cd Cloud-Stack-Club
   ```

2. **Install Project Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   *Update `.env` with your Supabase and Cloudflare R2 endpoints.*

4. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

5. **Lint Codebase**:
   ```bash
   npm run lint
   ```

6. **Build for Production**:
   ```bash
   npm run build
   ```
   Production assets will be generated in the `dist/` directory.

7. **Preview Production Build**:
   ```bash
   npm run preview
   ```

---

## 👥 Club Leadership & Coordinators

### Faculty Coordinators
- **Faculty Coordinator**: Dr. Deepti Sharma
- **Co-Faculty Coordinator**: Prof. Navjot Singh

### Student Executive Council
- **Secretary**: Lakshya Gosai
- **Joint Secretary**: Bani Kaur

### Institution
- **University**: Chandigarh University
- **Campus**: Mohali, Punjab, India
- **Official Website**: [https://www.cuchd.in/](https://www.cuchd.in/)

### Connect With Us
- 📸 **Instagram**: [@cloud_stackclub](https://www.instagram.com/cloud_stackclub?igsh=Z3l3dm1uamlsNms1)
- 💼 **LinkedIn**: [Cloud Stack Club](https://www.linkedin.com/in/cloud-stack-club-977987414/)
- 📧 **Email**: [cloudstackclub@cumail.in](mailto:cloudstackclub@cumail.in)

---

## 📄 License & Intellectual Property

This project is designed, developed, and maintained for **Cloud Stack Club, Chandigarh University**.

Copyright © 2026 Cloud Stack Club. All rights reserved.
