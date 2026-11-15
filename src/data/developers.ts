export interface DeveloperProfile {
  id: string;
  name: string;
  role: string;
  badge: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  fallbackAvatar?: string;
  location: string;
  education: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  resumeUrl: string;
  resumeFileName: string;
  techStack: {
    category: string;
    skills: { name: string; level?: 'Expert' | 'Advanced' | 'Proficient'; hot?: boolean }[];
  }[];
  keyContributions: {
    title: string;
    description: string;
    tag: string;
  }[];
  stats?: {
    label: string;
    value: string;
  }[];
}

export const DEVELOPERS_DATA: DeveloperProfile[] = [
  {
    id: 'utkrisht-utpal',
    name: 'Utkrisht Utpal',
    role: 'Lead Architect & Full Stack Engineer',
    badge: 'Co-Creator & Lead Dev',
    headline: 'Architecting scalable cloud systems, reactive UIs & developer tooling.',
    bio: 'Passionate Full Stack Engineer and Cloud enthusiast dedicated to building high-performance, real-time web platforms. Spearheaded the Cloud Stack Club web infrastructure, real-time certificate generation engine, dynamic verification marquee wall, and administrative CMS.',
    avatarUrl: 'https://github.com/Utkrisht-Utpal.png',
    location: 'Chandigarh University, Mohali, Punjab',
    education: 'B.E. Computer Science & Engineering (Cloud Computing)',
    email: 'utkrishtutpal1@gmail.com',
    githubUrl: 'https://github.com/Utkrisht-Utpal',
    linkedinUrl: 'https://www.linkedin.com/in/utkrisht-utpal',
    resumeUrl: '/resumes/utkrisht-utpal-resume.pdf',
    resumeFileName: 'Utkrisht_Utpal_Resume.pdf',
    techStack: [
      {
        category: 'Frontend Engineering',
        skills: [
          { name: 'React 19', hot: true, level: 'Expert' },
          { name: 'TypeScript', hot: true, level: 'Expert' },
          { name: 'Tailwind CSS v4', level: 'Expert' },
          { name: 'Framer Motion', level: 'Advanced' },
          { name: 'Vite', level: 'Expert' },
          { name: 'Next.js', level: 'Advanced' },
        ],
      },
      {
        category: 'Backend & Cloud Services',
        skills: [
          { name: 'Node.js', hot: true, level: 'Expert' },
          { name: 'Supabase', hot: true, level: 'Expert' },
          { name: 'PostgreSQL', level: 'Advanced' },
          { name: 'REST & RPC APIs', level: 'Expert' },
          { name: 'AWS & Cloudflare', level: 'Advanced' },
          { name: 'Docker', level: 'Proficient' },
        ],
      },
      {
        category: 'Architecture & Tooling',
        skills: [
          { name: 'System Design', hot: true, level: 'Advanced' },
          { name: 'Git & GitHub', level: 'Expert' },
          { name: 'Vercel Deployment', level: 'Expert' },
          { name: 'Security & Auth', level: 'Advanced' },
        ],
      },
    ],
    keyContributions: [
      {
        title: 'Platform Architecture & Performance',
        description:
          'Architected the responsive, modern frontend codebase utilizing React 19, TypeScript, and Tailwind CSS with sub-100ms client route transitions.',
        tag: 'Core Platform',
      },
      {
        title: 'Certificate Engine & 3D Marquee Wall',
        description:
          'Engineered the cryptographic certificate validation engine with 3-row interactive marquee wall and responsive high-res canvas verification.',
        tag: 'Credentials',
      },
      {
        title: 'Admin Command Center (CMS)',
        description:
          'Built the role-based administrative portal for managing live event registrations, bulletins, member records, and dynamic system settings.',
        tag: 'Admin Suite',
      },
      {
        title: 'Intelligent Club Chatbot Engine',
        description:
          'Implemented an interactive client-side NLP chatbot with dynamic database syncing, quick FAQs, and interactive terminal easter eggs.',
        tag: 'AI / Chatbot',
      },
    ],
    stats: [
      { label: 'Core Platform Lines of Code', value: '35,000+' },
      { label: 'Production Deployments', value: '140+' },
      { label: 'Event Registrations Processed', value: '1,500+' },
    ],
  },
  {
    id: 'sushant-kumar',
    name: 'Sushant Kumar',
    role: 'Lead Systems Developer & UI/UX Specialist',
    badge: 'Co-Creator & Lead Dev',
    headline: 'Crafting intuitive user experiences, robust data pipelines & interactive workflows.',
    bio: 'Full Stack Developer with a sharp eye for modern UI aesthetics, fluid animations, and robust backend integrations. Co-engineered the Cloud Stack Club platform, driving the interactive custom event registration pipelines, milestone telemetry, and responsive frontend experiences.',
    avatarUrl: 'https://github.com/sushant2806.png',
    location: 'Chandigarh University, Mohali, Punjab',
    education: 'B.E. Computer Science & Engineering (Cloud Computing)',
    email: 'sushant2804kumar@gmail.com',
    githubUrl: 'https://github.com/sushant2806',
    linkedinUrl: 'https://www.linkedin.com/in/sushant-kumar-055a40232',
    resumeUrl: '/resumes/sushant-kumar-resume.pdf',
    resumeFileName: 'Sushant_Kumar_Resume.pdf',
    techStack: [
      {
        category: 'Frontend & Experience Design',
        skills: [
          { name: 'React 19', hot: true, level: 'Expert' },
          { name: 'TypeScript', level: 'Advanced' },
          { name: 'Tailwind CSS', hot: true, level: 'Expert' },
          { name: 'Responsive UI/UX', level: 'Expert' },
          { name: 'Micro-Interactions', level: 'Advanced' },
          { name: 'Component Systems', level: 'Advanced' },
        ],
      },
      {
        category: 'Backend & Data Workflows',
        skills: [
          { name: 'Node.js', level: 'Advanced' },
          { name: 'Supabase & SQL', hot: true, level: 'Advanced' },
          { name: 'Dynamic Form Engines', level: 'Expert' },
          { name: 'Data Sanitization', level: 'Advanced' },
          { name: 'Cloud Integration', level: 'Proficient' },
        ],
      },
      {
        category: 'DevOps & Development Workflow',
        skills: [
          { name: 'Git Version Control', hot: true, level: 'Expert' },
          { name: 'Agile Feature Shipping', level: 'Expert' },
          { name: 'Performance Optimization', level: 'Advanced' },
          { name: 'Cross-browser QA', level: 'Expert' },
        ],
      },
    ],
    keyContributions: [
      {
        title: 'Custom Event Registration Pipeline',
        description:
          'Engineered dynamic conditional question fields, custom select dropdowns, and automated duplicate prevention in the event registration modal.',
        tag: 'Forms & Registrations',
      },
      {
        title: 'Milestone Telemetry & Analytics',
        description:
          'Developed live analytics synchronization for club milestones, attendee statistics, and dynamic engagement counters.',
        tag: 'Analytics',
      },
      {
        title: 'Synchronized Breathing Animations & UI Polish',
        description:
          'Designed signature aesthetic touches including the hero emblem breathing cycle, glassmorphic card hierarchy, and fluid mobile navigation.',
        tag: 'UI/UX Polish',
      },
      {
        title: 'Platform Quality & Resilient Workflows',
        description:
          'Continuous code reviews, multi-device layout responsiveness, and fallback handlers ensuring seamless experience across all screen sizes.',
        tag: 'Quality & QA',
      },
    ],
    stats: [
      { label: 'Event Registration Flows Built', value: '15+' },
      { label: 'UI Components Engineered', value: '45+' },
      { label: 'Club Milestone Syncs', value: '100% Real-time' },
    ],
  },
];
