import React from 'react';
import { BrowserRouter, Routes, Route, useOutletContext } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { EventsDirectoryPage } from './pages/EventsDirectoryPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { GalleryPage } from './pages/GalleryPage';
import { TeamPage } from './pages/TeamPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Wrapper for Home to receive layout outlet context
const HomeWrapper: React.FC = () => {
  const { onJoinClick } = useOutletContext<{ onJoinClick: () => void }>();
  return <HomePage onJoinClick={onJoinClick} />;
};

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
              <Route path="admin" element={<HomeWrapper />} />
              <Route path="admin/login" element={<HomeWrapper />} />
              <Route path="events" element={<EventsDirectoryPage />} />
              <Route path="events/:slug" element={<EventDetailPage />} />
              <Route path="events/:slug/register" element={<EventDetailPage />} />
              <Route path="events/:slug/registration" element={<EventDetailPage />} />
              <Route path="events/:slug/feedback" element={<EventDetailPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="*" element={<NotFoundPage />} />
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
