import React from 'react';
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
  const handleExploreEvents = () => {
    const el = document.getElementById('events');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
