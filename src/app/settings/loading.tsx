"use client";

export default function Loading() {
  return (
    <div className="flex h-full w-full">
      <div className="w-56 shrink-0 p-6 space-y-3">
        <div className="w-24 h-8 rounded-md skeleton-shimmer mb-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg skeleton-shimmer" />
        ))}
      </div>
      <div className="flex-1 p-8 space-y-6">
        <div className="h-8 w-32 rounded-md skeleton-shimmer" />
        <div className="h-40 rounded-2xl skeleton-shimmer" />
        <div className="h-32 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}