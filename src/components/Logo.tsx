"use client";

import React, { useEffect, useId, useState } from "react";

export type LogoStyle = "classic" | "modern";

const LOGO_STYLE_KEY = "bis-sih_logo_style";

export function getLogoStyle(): LogoStyle {
  if (typeof window === "undefined") return "modern";
  return (localStorage.getItem(LOGO_STYLE_KEY) as LogoStyle) || "modern";
}

function applyFontStyle(style: LogoStyle) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (style === "classic") {
    root.style.setProperty("--font-heading", "'Playfair Display', Georgia, serif");
    root.style.setProperty("--font-body", "'Inter', system-ui, sans-serif");
  } else {
    // Modern: Futura-based geometric fonts
    root.style.setProperty("--font-heading", "'Montserrat', 'Century Gothic', sans-serif");
    root.style.setProperty("--font-body", "'Montserrat', 'Century Gothic', sans-serif");
  }
}

export function setLogoStyle(style: LogoStyle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGO_STYLE_KEY, style);

  const body = document.body;
  body.style.transition = "opacity 0.18s ease";
  body.style.opacity = "0";

  setTimeout(() => {
    applyFontStyle(style);
    window.dispatchEvent(new Event("logostylechange"));
    body.style.opacity = "1";
    setTimeout(() => {
      body.style.transition = "";
    }, 200);
  }, 180);
}

interface LogoProps {
  className?: string;
  variant?: "home" | "header" | "sidebar";
}

// ─── BIS mark: a clinical pulse on deep-navy → azure ───
const BisMark: React.FC<{ className?: string }> = ({ className }) => {
  const gradientId = `bis-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="BIS-SIH mark"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#03045e" />
          <stop offset="1" stopColor="#0077b6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gradientId})`} />
      <polyline
        points="8,28 17,28 21,17 26,37 30,23 33,28 40,28"
        fill="none"
        stroke="#caf0f8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Classic wordmark (serif journal feel) ───
const ClassicWordmark: React.FC<{ className: string }> = ({ className }) => (
  <div className={`font-heading tracking-tight leading-none flex items-baseline ${className}`}>
    <span className="text-foreground font-normal">BIS</span>
    <span className="text-foreground font-bold">-SIH</span>
    <span className="ml-[0.3em] w-[0.28em] h-[0.28em] rounded-full bg-primary self-center"></span>
  </div>
);

// ─── Modern wordmark (geometric sans) ───
const ModernWordmark: React.FC<{ className: string }> = ({ className }) => (
  <div className={`flex items-baseline tracking-normal ${className}`}>
    <span
      className="text-foreground"
      style={{
        fontFamily: "'Futura', 'Century Gothic', 'Montserrat', sans-serif",
        fontWeight: 300,
      }}
    >
      BIS
    </span>
    <span
      className="text-foreground"
      style={{
        fontFamily: "'Futura', 'Century Gothic', 'Montserrat', sans-serif",
        fontWeight: 600,
      }}
    >
      -SIH
    </span>
    <span className="ml-[0.3em] w-[0.28em] h-[0.28em] rounded-full bg-primary self-center"></span>
  </div>
);

// ─── Main Logo Component (mark + wordmark lockup, scales with font-size) ───
const Logo: React.FC<LogoProps> = ({ className = "", variant = "header" }) => {
  const [style, setStyle] = useState<LogoStyle>(getLogoStyle);

  useEffect(() => {
    applyFontStyle(getLogoStyle());
    const handler = () => setStyle(getLogoStyle());
    window.addEventListener("logostylechange", handler);
    return () => window.removeEventListener("logostylechange", handler);
  }, []);

  void variant;

  return (
    <div className={`flex items-center gap-[0.45em] leading-none ${className}`}>
      <BisMark className="w-[1.7em] h-[1.7em] shrink-0" />
      {style === "classic" ? (
        <ClassicWordmark className="" />
      ) : (
        <ModernWordmark className="" />
      )}
    </div>
  );
};

export default Logo;
