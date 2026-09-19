"use client";

import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full animate-fade-up">
      {children}
    </div>
  );
}