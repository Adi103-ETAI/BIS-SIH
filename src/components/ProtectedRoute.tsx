"use client";

import { useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/lib/router";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground font-body">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
