import React from 'react';
import { BrowserRouter, Routes, Route, useOutletContext } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
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
