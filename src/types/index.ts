export type Theme = 'light' | 'dark';

export interface SiteConfig {
  name: string;
  tagline: string;
  university: string;
  coordinators: {
    faculty: string;
    coFaculty: string;
    secretary: string;
    jointSecretary: string;
  };
  contact: {
    email: string;
    location: string;
    socials: {
      instagram: string;
      linkedin: string;
    };
  };
  personalSocials: {
    linkedin: string;
    github: string;
  };
  navLinks: {
    name: string;
    href: string;
    isExternalPage?: boolean;
  }[];
}

export interface DomainItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  badge?: string;
}

export interface WhyJoinItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface EventCategoryItem {
  id: string;
  title: string;
  description: string;
  image: string;
  badge: string;
  features: string[];
}

export interface AboutPillarItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface TechBadge {
  name: string;
  category: string;
  iconName?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}
