'use client';

import { useState, useEffect, useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const context = useContext(ThemeContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !context) {
    // Return a placeholder to prevent layout shift
    return (
      <div className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700">
        <Moon className="w-5 h-5 text-zinc-700" />
      </div>
    );
  }

  const { theme, toggleTheme } = context;

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-all"
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={false}
        animate={{ rotate: theme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        )}
      </motion.div>
    </motion.button>
  );
}

