import React from 'react';
import { BrowserRouter, Routes, Route, useOutletContext } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { MainLayout } from './layouts/MainLayout';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { HomePage } from './pages/HomePage';

const EventsDirectoryPage = lazyWithRetry(() => import('./pages/EventsDirectoryPage'), 'EventsDirectoryPage');
const EventDetailPage = lazyWithRetry(() => import('./pages/EventDetailPage'), 'EventDetailPage');
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage'), 'GalleryPage');
const TeamPage = lazyWithRetry(() => import('./pages/TeamPage'), 'TeamPage');
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'), 'NotFoundPage');

// Wrapper for Home to receive layout outlet context
const HomeWrapper: React.FC = () => {
  const { onJoinClick } = useOutletContext<{ onJoinClick: () => void }>();
  return <HomePage onJoinClick={onJoinClick} />;
};

const PageLoader: React.FC = () => (
  <div className="flex-1 min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomeWrapper />} />
              <Route path="join" element={<HomeWrapper />} />
              <Route path="apply" element={<HomeWrapper />} />
              <Route path="discrepancy" element={<HomeWrapper />} />
              <Route path="query" element={<HomeWrapper />} />
              <Route path="about" element={<HomeWrapper />} />
              <Route path="domains" element={<HomeWrapper />} />
              <Route path="contact" element={<HomeWrapper />} />
              <Route path="contact-us" element={<HomeWrapper />} />
              <Route path="testimonials" element={<HomeWrapper />} />
              <Route path="admin" element={<HomeWrapper />} />
              <Route path="admin/login" element={<HomeWrapper />} />
              <Route
                path="events"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EventsDirectoryPage />
                  </React.Suspense>
                }
              />
              <Route
                path="events/:slug"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EventDetailPage />
                  </React.Suspense>
                }
              />
              <Route
                path="events/:slug/register"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EventDetailPage />
                  </React.Suspense>
                }
              />
              <Route
                path="events/:slug/registration"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EventDetailPage />
                  </React.Suspense>
                }
              />
              <Route
                path="events/:slug/feedback"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EventDetailPage />
                  </React.Suspense>
                }
              />
              <Route
                path="gallery"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <GalleryPage />
                  </React.Suspense>
                }
              />
              <Route
                path="team"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <TeamPage />
                  </React.Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <NotFoundPage />
                  </React.Suspense>
                }
              />
            </Route>
          </Routes>
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </AdminAuthProvider>
    </ThemeProvider>
  );
};

export default App;
