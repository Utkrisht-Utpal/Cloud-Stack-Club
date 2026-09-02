import React from 'react';
import { useNavigate } from 'react-router-dom';
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
