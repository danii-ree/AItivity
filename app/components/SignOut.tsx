'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
        return;
      }

      // Optional: Clear any additional local storage
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login page
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Error during sign out:', error);
      alert('Error signing out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="fixed top-4 right-20 z-50 p-3 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      title="Sign out"
    >
      {isSigningOut ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full"
        />
      ) : (
        <>
          <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">Sign Out</span>
        </>
      )}
    </motion.button>
  );
}