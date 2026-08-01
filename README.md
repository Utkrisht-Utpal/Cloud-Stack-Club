# ☁️ Cloud Stack Club — Chandigarh University

> **Learn • Build • Deploy • Scale**

A modern, high-performance, dark/light theme responsive web application for **Cloud Stack Club, Chandigarh University**. Built with React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, and Lucide Icons. The application fuses design principles from Vercel, Linear, Framer, GitHub, and Apple with a modern cloud-computing aesthetic.

---

## 🌐 Live Demo

🔗 **Live Website**: https://cloudstack-official.vercel.app/

---

## ✨ Features

- 🌓 **Dual Theme Support**: Seamless Light & Dark mode (using rich dark navy `#070a12`) with automatic system preference detection and `localStorage` persistence.
- ☁️ **Cloud Computing Aesthetic**: Dynamic HTML5 canvas particle background, ambient radial gradient blobs, floating cloud SVG vectors, and glassmorphism.
- 📱 **Fully Responsive**: Optimized for Desktop, Laptop, Tablet, and Mobile screens with no horizontal overflow.
- 🚀 **Interactive Hero Section**: Large cloud hero, animated text gradients, floating technology badges (AWS, Kubernetes, Docker, DevOps, Azure, React, Node.js), and terminal visual preview.
- 🎯 **About & Pillars**: Poster-inspired overview highlighting *Mission*, *Vision*, *Community*, *Innovation*, and *Learning*.
- 🛠️ **Domains & Tracks**: Showcase of technical domains (*Cloud Computing*, *Full Stack Development*, *DevOps*, *Web Development*, *Docker*, *Kubernetes*, *AI + Cloud*) with hover animations and gradient borders.
- 🌟 **Member Benefits**: Interactive cards detailing networking, hands-on experience, collaborative building, personal & professional growth, and career development.
- 📅 **Event Showcase**: Event category cards (*Hackathons*, *Ideathons*, *Expert Talks*, *Industry Visits*, *Workshops*, *Bootcamps*, *Coding Competitions*) with image previews and detail modals.
- 🔮 **Coming Soon Pages**: Dedicated Coming Soon views for **Gallery** and **Meet Our Team** featuring custom vector illustrations and home navigation.
- 📬 **Contact & Membership Application**: Contact section with Chandigarh University location, email, LinkedIn, Instagram, and responsive registration modal with success toast feedback.
- 📱 **Floating Mobile CTA**: Sticky mobile "Join Cloud Stack" bar appearing after scrolling past the hero.
- 🛡️ **Leadership Section**: Footer featuring Faculty & Student leadership (Dr. Deepti Sharma, Prof. Navjot Singh, Lakshay Gosai, Bani Kaur) without phone numbers.
- ⚡ **SEO & Accessibility**: Complete Open Graph meta tags, Twitter cards, `robots.txt`, `sitemap.xml`, custom SVG favicon, and ARIA labels.
- 🔮 **Future Ready**: Decoupled architecture stubbed in `src/services/supabase.ts` for future Auth, Admin Dashboard, Event CRUD, QR Attendance, and Certificate generation.

---

## 🛠️ Tech Stack

- **Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), PostCSS, Custom CSS Variables, Glassmorphism
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/) & Custom SVG icons
- **State & Theme**: React Context API, custom hooks, `localStorage`

---

## 📁 Project Structure

```text
cloud-stack-club/
├── public/
│   ├── favicon.svg          # Custom Cloud Stack favicon
│   ├── robots.txt           # SEO robots directives
│   └── sitemap.xml          # XML sitemap
├── src/
│   ├── assets/
│   │   └── images/          # CU Logo & placeholder graphics
│   ├── components/
│   │   ├── coming-soon/     # Gallery & Team Coming Soon views
│   │   ├── common/          # Navbar, Footer, FloatingMobileCTA, JoinModal
│   │   ├── sections/        # Hero, About, WhatWeDo, WhyJoin, Events, Contact
│   │   └── ui/              # Button, Card, SectionTitle, CloudBackground, ScrollProgress, Toast, Modal, SocialIcons
│   ├── constants/
│   │   ├── data.ts          # Badges, Domains, Events, WhyJoin data
│   │   └── siteConfig.ts    # Central metadata & coordinator names
│   ├── context/
│   │   └── ThemeContext.tsx # Light/Dark theme provider
│   ├── layouts/
│   │   └── MainLayout.tsx   # Global layout with Navbar, Progress bar, Background, Footer
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── GalleryPage.tsx
│   │   ├── TeamPage.tsx
│   │   └── NotFoundPage.tsx # Custom 404 page
│   ├── services/
│   │   └── supabase.ts      # Future backend stub
│   ├── styles/
│   │   └── index.css        # Tailwind styles & glassmorphism variables
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   ├── utils/
│   │   └── cn.ts            # Class merging utility
│   ├── App.tsx              # Router setup
│   └── main.tsx             # Application entrypoint
├── index.html               # Main HTML document with SEO tags
├── postcss.config.js        # PostCSS configuration
├── vite.config.js           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher)
- `npm` or `yarn` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/cloud-stack-club.git
   cd cloud-stack-club
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port specified in terminal) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```
   The production-ready output will be generated in the `dist/` directory.

5. **Preview production build locally**:
   ```bash
   npm run preview
   ```

---

## 👥 Club Leadership & Coordinators

- **Faculty Coordinator**: Dr. Deepti Sharma
- **Co-Faculty Coordinator**: Prof. Navjot Singh
- **Secretary**: Lakshay Gosai
- **Joint Secretary**: Bani Kaur
- **Institution**: Chandigarh University

---

## 📄 License

This project is created for **Cloud Stack Club, Chandigarh University**.

Copyright © 2026 Cloud Stack Club. All rights reserved. v1.0.20
