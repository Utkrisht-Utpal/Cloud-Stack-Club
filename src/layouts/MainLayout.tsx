import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { FloatingMobileCTA } from '../components/common/FloatingMobileCTA';
import { CloudBackground } from '../components/ui/CloudBackground';
import { ScrollProgress } from '../components/ui/ScrollProgress';
import { JoinModal } from '../components/common/JoinModal';
import { Toast } from '../components/ui/Toast';
import { ScrollToTop } from '../components/common/ScrollToTop';

export const MainLayout: React.FC = () => {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleOpenJoinModal = () => setJoinModalOpen(true);
  const handleCloseJoinModal = () => setJoinModalOpen(false);

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Route Scroll Restoration */}
      <ScrollToTop />

      {/* Top Scroll Reading Progress */}
      <ScrollProgress />

      {/* Cloud & Particle Background */}
      <CloudBackground />

      {/* Sticky Navbar */}
      <Navbar onOpenJoinModal={handleOpenJoinModal} />

      {/* Main Content Area */}
      <main className="flex-grow relative z-10">
        <Outlet context={{ onJoinClick: handleOpenJoinModal }} />
      </main>

      {/* Floating CTA on Mobile */}
      <FloatingMobileCTA onJoinClick={handleOpenJoinModal} />

      {/* Footer */}
      <Footer />

      {/* Join Membership Modal */}
      <JoinModal
        isOpen={joinModalOpen}
        onClose={handleCloseJoinModal}
        onSuccessToast={() => setShowSuccessToast(true)}
      />

      {/* Toast Notification */}
      <Toast
        isVisible={showSuccessToast}
        message="Welcome to Cloud Stack Club! Your application has been submitted successfully."
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
};
