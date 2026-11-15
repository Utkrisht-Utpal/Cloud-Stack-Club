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
    role: 'System Developer & Full Stack Engineer',
    badge: 'Lead Dev',
    headline: 'Architecting scalable fullstack web systems, reactive UIs & automated data pipelines.',
    bio: 'Creator and Lead Developer of the Cloud Stack Club platform. Conceptualized and engineered the platform architecture from the ground up — building the membership join workflows, event registration engines, attendee feedback pipelines, discrepancy query systems, achievement marquee wall, and administrative CMS.',
    avatarUrl: 'https://github.com/Utkrisht-Utpal.png',
    location: 'Khabra, Muzaffarpur, Bihar',
    education: 'CS Major with specialization in Fullstack Development',
    email: 'utkrishtutpal.dev@gmail.com',
    githubUrl: 'https://github.com/Utkrisht-Utpal',
    linkedinUrl: 'https://www.linkedin.com/in/utkrisht-utpal',
    resumeUrl: '/resumes/utkrisht-utpal-resume.pdf',
    resumeFileName: 'Utkrisht_Utpal_Resume.pdf',
    techStack: [
      {
        category: 'Frontend & Experience Engineering',
        skills: [
          { name: 'React 19', hot: true, level: 'Expert' },
          { name: 'TypeScript', hot: true, level: 'Expert' },
          { name: 'Tailwind CSS', hot: true, level: 'Expert' },
          { name: 'Responsive UI/UX', hot: true, level: 'Expert' },
          { name: 'Framer Motion', level: 'Advanced' },
          { name: 'Micro-Interactions', level: 'Advanced' },
          { name: 'Component Systems', level: 'Advanced' },
          { name: 'Vite', level: 'Expert' },
          { name: 'Next.js', level: 'Advanced' },
        ],
      },
      {
        category: 'Backend, Cloud & Data Pipelines',
        skills: [
          { name: 'Node.js', hot: true, level: 'Expert' },
          { name: 'Supabase & SQL', hot: true, level: 'Expert' },
          { name: 'Dynamic Form Engines', hot: true, level: 'Expert' },
          { name: 'Data Sanitization', level: 'Advanced' },
          { name: 'PostgreSQL', level: 'Advanced' },
          { name: 'REST & RPC APIs', level: 'Expert' },
          { name: 'Cloud Integration', level: 'Advanced' },
          { name: 'AWS & Cloudflare', level: 'Advanced' },
          { name: 'Docker', level: 'Proficient' },
        ],
      },
      {
        category: 'Architecture, DevOps & Workflow',
        skills: [
          { name: 'System Design', hot: true, level: 'Expert' },
          { name: 'Git & GitHub', hot: true, level: 'Expert' },
          { name: 'Agile Feature Shipping', level: 'Expert' },
          { name: 'Performance Optimization', level: 'Advanced' },
          { name: 'Vercel Deployment', level: 'Expert' },
          { name: 'Security & Auth', level: 'Advanced' },
          { name: 'Linux', level: 'Advanced' },
        ],
      },
    ],
    keyContributions: [
      {
        title: 'Join, Registration, Feedback & Query Pipelines',
        description:
          'Engineered the end-to-end form ecosystems and data processing pipelines for club membership applications, custom event registrations, attendee feedback submission, and discrepancy resolutions.',
        tag: 'Forms & Pipelines',
      },
      {
        title: 'Core Platform Architecture & Performance',
        description:
          'Designed and developed the entire web platform from scratch with React 19, TypeScript, and Tailwind CSS, achieving sub-100ms client route transitions.',
        tag: 'Platform Architecture',
      },
      {
        title: 'Certificate Validation & 3D Marquee Wall',
        description:
          'Created the cryptographic certificate validation system featuring 3-row interactive marquee animation and high-res canvas verification.',
        tag: 'Credentials',
      },
      {
        title: 'Admin Command Center (CMS)',
        description:
          'Engineered the complete role-based admin panel for live event management, broadcast bulletins, member records, and dynamic portal configurations.',
        tag: 'Admin Suite',
      },
    ],
    stats: [
      { label: 'Lines of Code Written', value: '35,000+' },
      { label: 'Form Pipelines Architected', value: '4 Complete Suites' },
      { label: 'Production Releases', value: '140+' },
    ],
  },
  {
    id: 'sushant-kumar',
    name: 'Sushant Kumar',
    role: 'UI/UX & Full Stack Developer',
    badge: 'Contributor',
    headline: 'Contributing to frontend components, interactive animations & testing workflows.',
    bio: 'Full Stack Developer contributing to the Cloud Stack Club web platform. Collaborated on frontend features, synchronized breathing emblem animations, club milestone telemetry, and cross-browser quality assurance testing.',
    avatarUrl: 'https://github.com/sushant2806.png',
    location: 'Tehwara, Muzaffarpur, Bihar',
    education: 'CS Major with specialization in Fullstack Development',
    email: 'sushant2804kumar@gmail.com',
    githubUrl: 'https://github.com/sushant2806',
    linkedinUrl: 'https://www.linkedin.com/in/sushant-kumar-055a40232',
    resumeUrl: '/resumes/sushant-kumar-resume.pdf',
    resumeFileName: 'Sushant_Kumar_Resume.pdf',
    techStack: [
      {
        category: 'Frontend & Experience Design',
        skills: [
          { name: 'React 19', hot: true, level: 'Advanced' },
          { name: 'TypeScript', level: 'Advanced' },
          { name: 'Tailwind CSS', hot: true, level: 'Advanced' },
          { name: 'Responsive UI/UX', level: 'Advanced' },
          { name: 'Micro-Interactions', level: 'Advanced' },
          { name: 'Component Systems', level: 'Advanced' },
        ],
      },
      {
        category: 'Backend & Data Workflows',
        skills: [
          { name: 'Node.js', level: 'Advanced' },
          { name: 'Supabase & SQL', hot: true, level: 'Advanced' },
          { name: 'Dynamic Form Engines', level: 'Advanced' },
          { name: 'Data Sanitization', level: 'Advanced' },
          { name: 'Cloud Integration', level: 'Proficient' },
        ],
      },
      {
        category: 'DevOps & Development Workflow',
        skills: [
          { name: 'Git Version Control', hot: true, level: 'Expert' },
          { name: 'Agile Feature Shipping', level: 'Advanced' },
          { name: 'Performance Optimization', level: 'Advanced' },
          { name: 'Cross-browser QA', hot: true, level: 'Expert' },
        ],
      },
    ],
    keyContributions: [
      {
        title: 'Synchronized Breathing Animation & UI Polish',
        description:
          'Contributed signature aesthetic touches including the hero emblem breathing cycle, glassmorphic card hierarchy, and fluid mobile navigation.',
        tag: 'UI Polish',
      },
      {
        title: 'Milestone Telemetry & Analytics',
        description:
          'Helped implement telemetry and synchronization for club milestone metrics, attendee statistics, and engagement counters.',
        tag: 'Analytics',
      },
      {
        title: 'Cross-Browser QA & Viewport Testing',
        description:
          'Conducted cross-browser responsiveness testing and multi-device QA checks ensuring seamless presentation across desktop and mobile.',
        tag: 'Quality Assurance',
      },
      {
        title: 'Collaborative Feature Shipping',
        description:
          'Collaborated on pull requests, feature testing, and agile updates across multiple platform releases.',
        tag: 'Contributions',
      },
    ],
    stats: [
      { label: 'UI Enhancements', value: '25+' },
      { label: 'QA Test Passes', value: '50+' },
      { label: 'Milestone Syncs', value: 'Real-time' },
    ],
  },
];
