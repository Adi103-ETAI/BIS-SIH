"use client";

import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/contexts/StoreContext";

function applyPersistedTheme() {
  const saved = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
  const root = document.documentElement;
  const body = document.body;

  root.classList.remove("dark", "light");
  body.classList.remove("dark", "light");

  if (saved === "dark" || !saved) {
    root.classList.add("dark");
    body.classList.add("dark");
    return;
  }

  if (saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
    body.classList.add("dark");
  }
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    applyPersistedTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <Toaster />
          <Sonner />
          {children}
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
