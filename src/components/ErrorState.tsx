import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState = ({ onRetry }: ErrorStateProps) => {
  return (
    <div className="w-full animate-fade-up text-center py-10">
      <AlertTriangle className="w-10 h-10 text-destructive/60 mx-auto mb-4" />
      <p className="text-foreground font-heading text-[18px] font-medium mb-1">Service temporarily unavailable</p>
      <p className="text-[14px] font-body text-muted-foreground mb-6">Please try again in a moment.</p>
      <button
        onClick={onRetry}
        className="text-[12px] uppercase tracking-[0.05em] font-body font-medium text-primary hover:text-primary-hover transition-colors"
      >
        Retry →
      </button>
    </div>
  );
};

export default ErrorState;
