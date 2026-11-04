import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { GallerySection } from '../components/gallery/GallerySection';

interface GalleryPageProps {
  defaultTab?: 'photos' | 'certificates';
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ defaultTab }) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const mode = tab === 'certificates' || defaultTab === 'certificates' ? 'certificates' : 'photos';

  return <GallerySection defaultMode={mode} />;
};

export default GalleryPage;
