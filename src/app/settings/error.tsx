"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full">
      <div className="w-56 shrink-0 p-6">
        <div className="w-24 h-8 rounded-md skeleton-shimmer mb-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg skeleton-shimmer mb-2" />
        ))}
      </div>
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-3 bg-destructive/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-semibold text-foreground">Settings unavailable</h2>
            <p className="text-sm text-muted-foreground mt-1">
              An error occurred while loading settings.
            </p>
          </div>
          <Button onClick={reset} variant="default">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}