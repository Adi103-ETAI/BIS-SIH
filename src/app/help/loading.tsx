"use client";

export default function Loading() {
  return (
    <div className="w-full max-w-4xl xl:max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 animate-fade-up">
      {/* Header skeleton */}
      <div className="flex items-start gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary w-12 h-12 skeleton-shimmer" />
        <div className="space-y-2">
          <div className="w-48 h-8 rounded-md skeleton-shimmer" />
          <div className="w-72 h-4 rounded-md skeleton-shimmer" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="space-y-6">
        <div className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-4 bg-background/40 border border-border/30 rounded-xl h-28 skeleton-shimmer" />
            <div className="p-4 bg-background/40 border border-border/30 rounded-xl h-28 skeleton-shimmer" />
            <div className="p-4 bg-background/40 border border-border/30 rounded-xl h-28 skeleton-shimmer" />
          </div>
        </div>
        <div className="p-6 bg-surface-high border border-border/50 rounded-2xl space-y-4">
          <div className="h-6 w-40 rounded-md skeleton-shimmer" />
          <div className="space-y-2">
            <div className="h-10 bg-background/40 border border-border/30 rounded-lg skeleton-shimmer" />
            <div className="h-10 bg-background/40 border border-border/30 rounded-lg skeleton-shimmer" />
            <div className="h-10 bg-background/40 border border-border/30 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}