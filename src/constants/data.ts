import type { AboutPillarItem, DomainItem, EventCategoryItem, TechBadge, WhyJoinItem } from '../types';

export const TECH_BADGES: TechBadge[] = [
  { name: 'Cloud Computing', category: 'Infrastructure' },
  { name: 'DevOps', category: 'Automation' },
  { name: 'Docker', category: 'Containers' },
  { name: 'Kubernetes', category: 'Orchestration' },
  { name: 'AWS', category: 'Cloud Provider' },
  { name: 'Azure', category: 'Cloud Provider' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
];

/**
 * About section pillars — sourced from official club Mission & Vision posters.
 *
 * MISSION: "To empower students with cloud technologies, hands-on learning and
 *           industry exposure to build innovative solutions and become future-ready professionals."
 *
 * VISION: "To empower students with cloud technologies, collaborative learning and
 *          real-world exposure to build scalable solutions and shape the future of technology."
 */
export const ABOUT_PILLARS: AboutPillarItem[] = [
  {
    id: 'mission',
    title: 'Our Mission',
    description: 'To empower students with cloud technologies, hands-on learning and industry exposure to build innovative solutions and become future-ready professionals.',
    iconName: 'Target',
  },
  {
    id: 'vision',
    title: 'Our Vision',
    description: 'To empower students with cloud technologies, collaborative learning and real-world exposure to build scalable solutions and shape the future of technology.',
    iconName: 'Eye',
  },
  {
    id: 'cloud-knowledge',
    title: 'Cloud Knowledge',
    description: 'Spread awareness and build strong foundations in cloud computing and emerging technologies across the student community.',
    iconName: 'Cloud',
  },
  {
    id: 'innovation',
    title: 'Innovation & Research',
    description: 'Promote research, critical thinking and innovative problem solving by encouraging students to experiment boldly and build with impact.',
    iconName: 'Lightbulb',
  },
  {
    id: 'collaboration',
    title: 'Team Collaboration',
    description: 'Build a strong community of learners who support, share and grow together — learning from each other as much as from experts.',
    iconName: 'Users',
  },
  {
    id: 'future-ready',
    title: 'Future Ready Skills',
    description: 'Develop in-demand skills to excel in internships, placements and beyond — preparing students for the challenges of tomorrow\'s tech industry.',
    iconName: 'Rocket',
  },
];

export const DOMAINS: DomainItem[] = [
  {
    id: 'cloud-computing',
    title: 'Cloud Computing',
    description: 'Learn modern cloud technologies and build scalable applications on AWS, Azure and GCP with hands-on industry-grade projects.',
    iconName: 'Cloud',
    badge: 'Core Focus',
  },
  {
    id: 'devops',
    title: 'DevOps & Automation',
    description: 'Explore CI/CD pipelines, automation and deployment workflows — from containerization to zero-downtime releases.',
    iconName: 'Cpu',
    badge: 'Trending',
  },
  {
    id: 'full-stack',
    title: 'Full Stack Development',
    description: 'Build end-to-end modern web applications using React, Next.js, Node.js, and scalable cloud-connected databases.',
    iconName: 'Layers',
    badge: 'Popular',
  },
  {
    id: 'docker',
    title: 'Docker & Kubernetes',
    description: 'Containerize and orchestrate microservices for consistent, scalable, and cloud-native application delivery.',
    iconName: 'Box',
  },
  {
    id: 'industry-exposure',
    title: 'Industry Exposure',
    description: 'Connect with industry experts and gain insights through sessions, events and collaborations that bridge campus and career.',
    iconName: 'Globe',
    badge: 'Key Benefit',
  },
  {
    id: 'ai-cloud',
    title: 'AI + Cloud',
    description: 'Deploy machine learning models to the cloud, build LLM-powered apps, and explore serverless AI pipelines and intelligent agents.',
    iconName: 'Sparkles',
    badge: 'Next-Gen',
  },
];

/**
 * Why Join section — based on Core Values from club poster:
 * Think Cloud | Learn Daily | Build Fearlessly | Collaborate | Grow Together
 */
export const WHY_JOIN_REASONS: WhyJoinItem[] = [
  {
    id: 'think-cloud',
    title: 'Think Cloud',
    description: 'Dream big. Think beyond limits. We cultivate a mindset that pushes students to explore cloud-scale possibilities and bold ideas.',
    iconName: 'Cloud',
  },
  {
    id: 'learn-daily',
    title: 'Learn Daily',
    description: 'Keep learning. Stay curious. From expert-led workshops and bootcamps to peer sessions, there is always something new to discover.',
    iconName: 'BookOpen',
  },
  {
    id: 'build-fearlessly',
    title: 'Build Fearlessly',
    description: 'Build ideas. Build impact. Gain real experience through hands-on projects, hackathons, and live cloud deployments.',
    iconName: 'Code',
  },
  {
    id: 'collaborate',
    title: 'Collaborate',
    description: 'Together we learn, together we grow. Join a strong community of like-minded builders who support and inspire each other.',
    iconName: 'Users',
  },
  {
    id: 'grow-together',
    title: 'Grow Together',
    description: 'Empowering today, leading tomorrow. Develop future-ready skills for internships, placements, and beyond with the club by your side.',
    iconName: 'TrendingUp',
  },
  {
    id: 'industry-exposure',
    title: 'Industry Exposure',
    description: 'Connect with industry experts and gain real insights through expert sessions, events, and collaborations that bridge the gap between campus and career.',
    iconName: 'Briefcase',
  },
];

export const EVENT_CATEGORIES: EventCategoryItem[] = [
  {
    id: 'hackathons',
    title: 'Hackathons',
    description: 'High-energy 24–48 hour coding marathons where teams solve real-world challenges using cloud computing, DevOps and AI.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    badge: 'Major Event',
    features: ['Real-world Industry Prompts', 'Cash Prizes & Swag', 'Mentor Support'],
  },
  {
    id: 'ideathons',
    title: 'Ideathons',
    description: 'Brainstorming and pitch competitions for novel cloud architectures, SaaS ideas, and social impact solutions.',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    badge: 'Innovation',
    features: ['Design Thinking', 'Pitching to Experts', 'Product Validation'],
  },
  {
    id: 'expert-talks',
    title: 'Expert Talks',
    description: 'Keynote sessions with Cloud Architects, DevOps Engineers, and Senior Developers from top tech companies providing real industry insights.',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    badge: 'Mentorship',
    features: ['Industry Insights', 'Q&A Sessions', 'Networking'],
  },
  {
    id: 'industry-visits',
    title: 'Industry Visits',
    description: 'Excursions to data centers, tech parks, and leading companies to gain first-hand corporate exposure and experience enterprise IT setups.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    badge: 'Exposure',
    features: ['Data Center Tours', 'Corporate Culture', 'Field Learning'],
  },
  {
    id: 'workshops',
    title: 'Workshops',
    description: 'Interactive hands-on sessions on Docker, AWS deployment, CI/CD, Kubernetes, and full-stack cloud development stacks.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    badge: 'Hands-on',
    features: ['Guided Coding', 'Live Deployment', 'Certificate of Completion'],
  },
  {
    id: 'bootcamps',
    title: 'Bootcamps',
    description: 'Multi-week intensive learning cohorts designed to take students from cloud basics to real-world advanced deployment at scale.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    badge: 'Cohort',
    features: ['Capstone Projects', 'Peer Code Reviews', 'Certification Prep'],
  },
];
