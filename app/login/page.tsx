'use client';
import { LogIn } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) router.push('/');
    });
  }, [router]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
         provider: "google",
         options: {
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar'
         }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative min-h-screen flex items-center justify-center"
    >
      <div className="absolute inset-0 -z-10 animate-gradient-x bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400" />
      {/* Optional SVG Blobs Layer */}

      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
        className="p-10 rounded-2xl shadow-2xl border border-zinc-300 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm flex flex-col items-center"
      >
        <motion.h1
          className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-fuchsia-500 mb-6"
          initial={{ letterSpacing: '-0.1em' }}
          animate={{ letterSpacing: '0.03em' }}
          transition={{ duration: 1.0 }}
        >
          Sign in to Productivity AI
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.07, boxShadow: "0 8px 32px 0 rgba(0,0,0,0.2)" }}
          whileTap={{ scale: 0.93 }}
          onClick={signInWithGoogle}
          className="flex items-center gap-3 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 px-8 py-3 rounded-xl font-semibold shadow-xl hover:bg-fuchsia-50 dark:hover:bg-zinc-700 transition-all text-lg"
        >
          <LogIn className="h-6 w-6 text-[#4285F4]" />
          Continue with Google
        </motion.button>
      </motion.div>
    </motion.div>
  );
}