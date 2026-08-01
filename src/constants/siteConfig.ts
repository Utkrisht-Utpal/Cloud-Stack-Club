import type { SiteConfig } from '../types';

export const siteConfig: SiteConfig = {
  name: 'Cloud Stack Club',
  tagline: 'Learn • Build • Deploy • Scale',
  university: 'Chandigarh University',
  coordinators: {
    faculty: 'Dr. Deepti Sharma',
    coFaculty: 'Prof. Navjot Singh',
    secretary: 'Lakshay Gosai',
    jointSecretary: 'Bani Kaur',
  },
  contact: {
    email: 'cloudstack@cumail.in',
    location: 'Chandigarh University, Mohali, Punjab',
    socials: {
      instagram: 'https://www.instagram.com/cloud_stackclub?igsh=Z3l3dm1uamlsNms1',
      linkedin: 'https://www.linkedin.com/in/cloud-stack-club-977987414/',
    },
  },
  // Personal social profile links (LinkedIn & GitHub only):
  personalSocials: {
    linkedin: 'https://www.linkedin.com/in/utkrisht-utpal',
    github: 'https://github.com/Utkrisht-Utpal',
  },
  navLinks: [
    { name: 'Home', href: '/#hero' },
    { name: 'About', href: '/#about' },
    { name: 'Domains', href: '/#domains' },
    { name: 'Events', href: '/#events' },
    { name: 'Gallery', href: '/gallery', isExternalPage: true },
    { name: 'Meet Our Team', href: '/team', isExternalPage: true },
    { name: 'Contact', href: '/#contact' },
  ],
};
