"use client";

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
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px] px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="p-3 bg-destructive/10 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      </div>
    </div>
  );
}