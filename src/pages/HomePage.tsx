import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HeroSection } from '../components/sections/HeroSection';
import { AboutSection } from '../components/sections/AboutSection';
import { WhatWeDoSection } from '../components/sections/WhatWeDoSection';
import { WhyJoinSection } from '../components/sections/WhyJoinSection';
import { EventsSection } from '../components/sections/EventsSection';
import { ContactSection } from '../components/sections/ContactSection';

interface HomePageProps {
  onJoinClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onJoinClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let targetId = '';
    if (location.pathname === '/about') targetId = 'about';
    else if (location.pathname === '/domains') targetId = 'domains';
    else if (location.pathname === '/contact') targetId = 'contact';
    else if (location.hash) targetId = location.hash.replace('#', '');

    if (targetId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  const handleExploreEvents = () => {
    navigate('/events');
  };

  return (
    <div className="space-y-12">
      <HeroSection onJoinClick={onJoinClick} onExploreEventsClick={handleExploreEvents} />
      <AboutSection />
      <WhatWeDoSection />
      <WhyJoinSection />
      <EventsSection />
      <ContactSection />
    </div>
  );
};
