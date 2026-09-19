const LoadingState = () => {
  return (
    <div className="w-full animate-fade-up">
      {/* Source badges row */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <div className="h-[18px] w-14 rounded-full skeleton-shimmer" />
        <div className="h-[18px] w-20 rounded-full skeleton-shimmer" />
        <div className="h-[18px] w-12 rounded-full skeleton-shimmer" />
      </div>

      {/* Title bar */}
      <div className="h-6 w-3/5 rounded-md skeleton-shimmer mb-4" />

      {/* Paragraph lines mimicking answer body */}
      <div className="space-y-2.5">
        <div className="h-4 skeleton-shimmer rounded-md w-full" />
        <div className="h-4 skeleton-shimmer rounded-md w-[97%]" />
        <div className="h-4 skeleton-shimmer rounded-md w-[92%]" />
        <div className="h-4 skeleton-shimmer rounded-md w-4/6" />
      </div>

      <div className="space-y-2.5 mt-4">
        <div className="h-4 skeleton-shimmer rounded-md w-[88%]" />
        <div className="h-4 skeleton-shimmer rounded-md w-full" />
        <div className="h-4 skeleton-shimmer rounded-md w-3/5" />
      </div>

      {/* Citation row */}
      <div className="mt-6 pt-3 border-t border-border/50 flex items-center gap-3">
        <div className="h-3 w-12 rounded-md skeleton-shimmer" />
        <div className="h-3 w-16 rounded-md skeleton-shimmer" />
        <div className="h-3 w-20 rounded-md skeleton-shimmer ml-auto" />
      </div>
    </div>
  );
};

export default LoadingState;
