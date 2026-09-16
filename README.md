# ☁️ Cloud Stack Club — Chandigarh University

> **Learn • Build • Deploy • Scale**

The official web platform and community management system for **Cloud Stack Club, Chandigarh University**. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, **Supabase PostgreSQL**, and **Cloudflare R2 CDN**.

The portal provides an intuitive, high-performance experience for university students, event participants, club members, faculty coordinators, and student leaders.

---

## 🌐 Live Portal & Official Links

- 🔗 **Official Website**: [https://cloudstack-official.vercel.app/](https://cloudstack-official.vercel.app/)
- 🏛️ **Affiliation**: Chandigarh University, Mohali, Punjab, India
- 📧 **Official Email**: [cloudstackclub@cumail.in](mailto:cloudstackclub@cumail.in)
- 💼 **LinkedIn**: [Cloud Stack Club](https://www.linkedin.com/in/cloud-stack-club-977987414/)
- 📸 **Instagram**: [@cloud_stackclub](https://www.instagram.com/cloud_stackclub?igsh=Z3l3dm1uamlsNms1)

---

## ✨ Key Features & Capabilities

### 🎨 1. Modern Design & Interactive UI
- **Dual Theme System**: Seamless toggle between Dark Navy and Light mode with automatic system preference detection.
- **Cosmic Cloud Background**: Interactive particle canvas with smooth animations and ambient cloud styling.
- **Interactive Cursor & Progress Tracking**: Particle trail cursor and top reading progress indicator.
- **Fully Responsive**: Optimized for mobile phones, tablets, laptops, and wide desktop displays.
- **Real-Time Notice Board**: Dynamic announcement banners and flash notices for urgent campus updates.

---

### 🎪 2. Events, Workshops & Hackathons
- **Events Directory (`/events`)**: Browse upcoming, live, and past club events with category filters (*Hackathons, Workshops, Bootcamps, Expert Talks*).
- **Comprehensive Event Detail Pages**: Full event itineraries, eligibility criteria, prize pools, official posters, PDF brochures, and organizer contacts.
- **Solo & Team Registrations**:
  - Register as an individual or create a team with customized member limits.
  - Automatically captures student name, university ID (UID), email, phone, department, and academic year.
  - Instant automated registration number generation (`REG-YYYYMMDD-XXXXXX`).
  - WhatsApp group joining links for verified event participants and team leaders.
- **Self-Service Registration Lookup**: Check registration status, team roster, and download passes using UID.
- **Post-Event Reviews & Feedback**: Submit star ratings and feedback to help improve future workshops.

---

### 🖼️ 3. Dynamic Photo Gallery (`/gallery`)
- **Smart Aspect-Ratio Layout**: Justified, edge-to-edge photo layout inspired by Google Photos and Apple Photos.
- **Aspect Ratio Preservation**: Displays landscape, portrait, and panoramic images without awkward cropping or distortion.
- **Interactive Lightbox**: Fullscreen high-resolution photo viewer with keyboard navigation and instant downloads.

---

### 💬 4. Authentic Testimonials Showcase
- **Community Reviews**: Highlights genuine feedback, reviews, and experiences from past workshop attendees and event winners.
- **Verified Participant Badges**: Author credentials, department, and event associations clearly displayed.

---

### 👥 5. Executive Leadership & Core Council (`/team`)
- **Leadership Profiles**: Directory of Faculty Coordinators, Student Secretaries, Technical Domain Leads, and Core Members.
- **Professional Portfolios**: Direct links to LinkedIn, GitHub, Twitter/X, Instagram, and personal portfolios.

---

### 🤖 6. AI Chatbot Assistant
- **24/7 Student Companion**: Floating on-page assistant answering common queries about club memberships, technical workshops, upcoming hackathons, and eligibility.
- **Rich Interactive Responses**: Instant smart answers with markdown support and quick recommendation prompts.

---

### 📝 7. Student Onboarding & Membership
- **Online Application Portal (`/join`)**: Streamlined multi-step onboarding for aspiring students to join technical tracks (*Cloud Computing, DevOps, Full-Stack Development, Containerization, AI/ML*).
- **Credential & Grievance Resolution (`/discrepancy`)**: Dedicated portal for students to resolve UID mismatches, profile updates, and registration queries.

---

### 🛠️ 8. Administration Suite (`/admin`)
A centralized management dashboard for authorized club administrators:
- **Member Directory Management**: Review, approve, or reject student membership applications with personalized feedback.
- **Event Lifecycle Manager**: Create events, manage dynamic registration forms, set seat caps, and monitor live attendee rosters.
- **Roster Export**: Download complete participant rosters in formatted **Excel (`.xlsx`)** and **PDF** formats with department and year details.
- **Email Studio & Notification Dispatcher**: Visual email template designer and automated delivery of professional approval, rejection, and event broadcast emails.
- **Gallery & Media Management**: Multi-photo uploads, image cropping, and album curation.
- **Notice Board & Role Hierarchy**: Publish real-time announcements and configure club role hierarchy.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| **Routing & State** | React Router DOM v7, React Context API |
| **Icons & UI** | Lucide React |
| **Backend & Database** | Supabase (PostgreSQL 15+) |
| **Media & CDN** | Cloudflare Workers & R2 Object Storage |
| **Export Engines** | SheetJS (XLSX), jsPDF & AutoTable |
| **Hosting** | Vercel (Edge Network) |

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
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_MEDIA_WORKER_URL=your-cloudflare-worker-url
   VITE_R2_PUBLIC_URL=your-r2-public-bucket-url
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

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
