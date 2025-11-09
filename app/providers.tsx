'use client';

import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure theme is applied on mount
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
    
    const root = document.documentElement;
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

