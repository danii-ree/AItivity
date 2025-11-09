"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    };
    check();
    // Optionally listen to session change if you want to auto-logout on sign out
    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white text-2xl">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}