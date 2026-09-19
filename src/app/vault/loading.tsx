"use client";

export default function Loading() {
  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg skeleton-shimmer" />
          <div className="space-y-1.5">
            <div className="w-44 h-6 rounded-md skeleton-shimmer" />
            <div className="w-32 h-3 rounded-md skeleton-shimmer" />
          </div>
        </div>
        <div className="w-24 h-9 rounded-lg skeleton-shimmer" />
      </div>
      {/* Body skeleton: sidebar + (toolbar + cards) */}
      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-2">
          <div className="h-10 rounded-lg skeleton-shimmer" />
          <div className="h-9 rounded-lg skeleton-shimmer" />
          <div className="h-9 rounded-lg skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-lg skeleton-shimmer" />
            <div className="w-32 h-10 rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-28 rounded-xl skeleton-shimmer" />
          <div className="h-28 rounded-xl skeleton-shimmer" />
          <div className="h-28 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}