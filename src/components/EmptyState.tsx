import { SearchX } from "lucide-react";

interface EmptyStateProps {
  onRetry: () => void;
}

const EmptyState = ({ onRetry }: EmptyStateProps) => {
  return (
    <div className="w-full animate-fade-up text-center py-10">
      <SearchX className="w-10 h-10 text-secondary/50 mx-auto mb-4" />
      <p className="text-foreground font-heading text-[18px] font-medium mb-1">No results found</p>
      <p className="text-[14px] font-body text-muted-foreground mb-6">
        Try rephrasing your question or using more specific medical terminology.
      </p>
      <button
        onClick={onRetry}
        className="text-[12px] uppercase tracking-[0.05em] font-body font-medium text-primary hover:text-primary-hover transition-colors"
      >
        Try another query →
      </button>
    </div>
  );
};

export default EmptyState;
