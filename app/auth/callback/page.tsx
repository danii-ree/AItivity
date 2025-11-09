// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Processing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setStatus(`Authentication failed: ${error.message}`);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (session) {
          console.log('✅ Authentication successful:', session.user.email);
          setStatus('Redirecting to dashboard...');
          setTimeout(() => router.push('/'), 1000);
        } else {
          console.log('❌ No session found');
          setStatus('No session found. Redirecting...');
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus(`Error: ${error.message}`);
        setTimeout(() => router.push('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-zinc-600 dark:text-zinc-400">{status}</p>
      </div>
    </div>
  );
}