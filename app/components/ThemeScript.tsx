'use client';

import { useEffect } from 'react';

export function ThemeScript() {
  useEffect(() => {
    // Set theme immediately on mount
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

  return null;
}

