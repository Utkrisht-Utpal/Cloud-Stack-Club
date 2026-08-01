import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Image, ArrowLeft, Sparkles, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const GalleryComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-4 relative z-10">
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* Vector SVG Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/20 via-sky-500/20 to-cyan-500/20 blur-3xl animate-pulse" />
          
          <div className="relative z-10 w-full h-full glass-panel rounded-3xl p-8 flex flex-col items-center justify-center border-blue-500/30 shadow-2xl">
            <div className="p-6 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-xl shadow-blue-500/30 animate-float">
              <Camera className="w-16 h-16 stroke-[1.5]" />
            </div>
            
            <div className="mt-6 flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span>Event Photo Stream</span>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
            Gallery Showcase
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Coming Soon
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Gallery will be available after upcoming events. Stay tuned to capture our hackathons, workshops, and cloud tech summits in action!
          </p>
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowLeft className="w-5 h-5" />}
            iconPosition="left"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </motion.div>

      </div>
    </div>
  );
};
