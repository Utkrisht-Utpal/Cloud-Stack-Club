import React, { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { FloatingMobileCTA } from '../components/common/FloatingMobileCTA';
import { CloudBackground } from '../components/ui/CloudBackground';
import { ScrollProgress } from '../components/ui/ScrollProgress';
import { Toast } from '../components/ui/Toast';
import { ScrollToTop } from '../components/common/ScrollToTop';
import { EventAdModal } from '../components/common/EventAdModal';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useScrollbarFallback } from '../utils/useScrollbarFallback';
import { getEvents } from '../services/events';
import type { Event } from '../types/database';

import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { lazyWithRetry } from '../utils/lazyWithRetry';

import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminLoginModal } from '../components/admin/AdminLoginModal';

// Code-splitting with auto-retry on 404 deployment stale chunks
const JoinModal = lazyWithRetry(() => import('../components/common/JoinModal'), 'JoinModal');
const EventRegisterModal = lazyWithRetry(() => import('../components/common/EventRegisterModal'), 'EventRegisterModal');
const EventPdfModal = lazyWithRetry(() => import('../components/admin/EventPdfModal'), 'EventPdfModal');


const getInitialCachedEvents = (): Event[] => {
  try {
    const cached = localStorage.getItem('csc_custom_events_list');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const MainLayout: React.FC = () => {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedRegisterEvent, setSelectedRegisterEvent] = useState<Event | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [eventsList, setEventsList] = useState<Event[]>(getInitialCachedEvents);
  const [selectedAdPdf, setSelectedAdPdf] = useState<{ url: string; title: string } | null>(null);
  const { showDashboard, logout } = useAdminAuth();

  useEffect(() => {
    // Prioritized direct DB fetch (takes ~150ms) for 100% accurate live event popup
    getEvents()
      .then((fetchedEvents) => {
        if (fetchedEvents && fetchedEvents.length > 0) {
          setEventsList(fetchedEvents);
        }
      })
      .catch(console.error);
  }, []);

  // Hide native vertical scrollbar while ScrollProgress indicator is healthy;
  // automatically restores it if the indicator fails or is removed.
  useScrollbarFallback('[data-scroll-progress]');

  const handleOpenJoinModal = () => setJoinModalOpen(true);
  const handleCloseJoinModal = () => setJoinModalOpen(false);

  if (showDashboard) {
    return (
      <div className="relative min-h-screen flex flex-col selection:bg-blue-500 selection:text-white">
        <ScrollToTop />
        <CloudBackground />
        <Navbar isAdminDashboard={true} onAdminLogout={logout} />
        <ErrorBoundary>
          <AdminDashboard />
        </ErrorBoundary>
        <Footer />
      </div>
    );
  }

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
        <Outlet context={{ onJoinClick: handleOpenJoinModal, onRegisterEventClick: (evt: Event) => setSelectedRegisterEvent(evt) }} />
      </main>

      {/* Floating CTA on Mobile */}
      <FloatingMobileCTA onJoinClick={handleOpenJoinModal} />

      {/* Footer */}
      <Footer />

      {/* Full-Sized Hero Upcoming Event Announcement Ad Modal */}
      <EventAdModal
        events={eventsList}
        onRegisterClick={(targetEvent) => setSelectedRegisterEvent(targetEvent)}
        onViewPdfClick={(url, title) => setSelectedAdPdf({ url, title })}
      />

      {/* Code-split Non-Critical Modals (Loaded on demand or in background after initial popup fetch) */}
      <Suspense fallback={null}>
        {/* Event Registration Modal for Specific Event */}
        {selectedRegisterEvent && (
          <EventRegisterModal
            isOpen={!!selectedRegisterEvent}
            onClose={() => setSelectedRegisterEvent(null)}
            event={selectedRegisterEvent}
            onSuccessToast={() => setShowSuccessToast(true)}
          />
        )}

        {/* Event PDF Viewer Modal */}
        {selectedAdPdf && (
          <EventPdfModal
            isOpen={!!selectedAdPdf}
            onClose={() => setSelectedAdPdf(null)}
            pdfUrl={selectedAdPdf.url}
            eventTitle={selectedAdPdf.title}
          />
        )}

        {/* Join Membership Modal */}
        {joinModalOpen && (
          <JoinModal
            isOpen={joinModalOpen}
            onClose={handleCloseJoinModal}
            onSuccessToast={() => setShowSuccessToast(true)}
          />
        )}

        {/* Admin Login Modal */}
        <AdminLoginModal />
      </Suspense>

      {/* Toast Notification */}
      <Toast
        isVisible={showSuccessToast}
        message="Welcome to Cloud Stack Club! Your application has been submitted successfully."
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
};
