"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Lightbulb, ArrowRightLeft, BookOpen, ArrowUp, Square } from "lucide-react";
import Logo from "./Logo";

const EXAMPLES = [
  { label: "IS 10500 drinking water", query: "What are the requirements for drinking water as per IS 10500?", icon: Lightbulb },
  { label: "ISI certification process", query: "How do I get ISI certification for my product?", icon: ArrowRightLeft },
  { label: "Gold hallmarking", query: "What is hallmarking for gold jewellery?", icon: BookOpen },
];

interface QueryZoneProps {
  onSubmit: (query: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  hasResults: boolean;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  const name = typeof window === "undefined"
    ? ""
    : (window.localStorage.getItem("bis-sih_display_name") || "").trim();
  const suffix = name ? `, ${name}` : "";

  let salutation: string;
  if (hour >= 5 && hour < 12) salutation = "Good Morning";
  else if (hour >= 12 && hour < 17) salutation = "Good Afternoon";
  else if (hour >= 17 && hour < 21) salutation = "Good Evening";
  else if (hour >= 21 && hour < 24) salutation = "Working Late";
  else if (hour >= 0 && hour < 3) salutation = "Burning the Midnight Oil";
  else salutation = "Up Before Dawn"; // 3-5

  return `${salutation}${suffix}`;
};

const QueryZone = ({ onSubmit, onStop, isLoading, hasResults }: QueryZoneProps) => {
  const [query, setQuery] = useState("");
  const [greeting, setGreeting] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set greeting on client after hydration
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Press "/" anywhere to focus the inquiry box.
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSubmit = (q?: string) => {
    const finalQuery = (q ?? query).trim();
    if (!finalQuery || isLoading) return;
    if (q) setQuery(q);
    onSubmit(finalQuery);
    if (!q) setQuery("");
  };

  return (
    <div className={`w-full max-w-3xl md:max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${hasResults ? "" : "pt-8 sm:pt-10 pb-5 sm:pb-6"}`}>
      {!hasResults && (
        <div className="text-center mb-10 animate-fade-up">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-body font-medium text-secondary mb-3 sm:mb-4">
            {greeting}
          </p>
            <div className="mb-8 flex justify-center items-center gap-3">
              <Logo variant="home" className="text-[32px] sm:text-[40px] lg:text-[48px]" />
            </div>
        </div>
      )}

      {/* Inquiry Bar */}
      <div className="relative transition-all">
        <div className="flex items-center bg-card rounded-2xl journal-ring journal-shadow transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/30">
          <div className="pl-5 text-secondary/60">
            <Search className="w-[18px] h-[18px]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={hasResults ? "Reply..." : "Ask about Indian Standards..."}
            className="flex-1 h-12 sm:h-14 pl-3 pr-3 text-[14px] sm:text-[15px] font-body bg-transparent text-foreground placeholder:text-secondary/50 focus:outline-none"
          />
          <button
            onClick={() => (isLoading ? onStop?.() : handleSubmit())}
            disabled={isLoading ? !onStop : !query.trim()}
            aria-label={isLoading ? "Stop request" : "Submit query"}
            title={isLoading ? "Stop request" : "Submit query"}
            className="shrink-0 w-10 h-10 mr-2 flex items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all disabled:opacity-40 disabled:pointer-events-none hover:bg-primary-hover active:scale-95"
          >
            {isLoading ? (
              <Square className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!hasResults && (
        <div className="flex flex-wrap justify-center gap-2.5 mt-6 sm:mt-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => handleSubmit(ex.query)}
              className="flex items-center gap-2 text-[12px] sm:text-[13px] font-body font-medium text-secondary border border-border px-4 py-2.5 rounded-full hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all"
            >
              <ex.icon className="w-3.5 h-3.5" />
              {ex.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueryZone;
