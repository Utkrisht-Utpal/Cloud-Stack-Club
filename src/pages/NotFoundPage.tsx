import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-4 relative z-10">
      <div className="max-w-md w-full text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-24 h-24 rounded-3xl glass-panel flex items-center justify-center text-blue-500 border-blue-500/30 shadow-2xl"
        >
          <CloudOff className="w-12 h-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2"
        >
          <span className="text-4xl font-extrabold text-gradient">404</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The cloud resource or route you requested does not exist or has been moved.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            variant="primary"
            size="md"
            icon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
