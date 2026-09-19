"use client";

import { useEffect, useMemo, useState } from "react";

const NAVIGATION_EVENT = "bis-sih:navigate";

type LocationState = {
  pathname: string;
  search: string;
  hash: string;
};

function readLocation(): LocationState {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "", hash: "" };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

function notifyNavigation() {
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function navigate(to: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;

  if (options?.replace) {
    window.history.replaceState({}, "", to);
  } else {
    window.history.pushState({}, "", to);
  }

  notifyNavigation();
}

export function useLocationState() {
  const [location, setLocation] = useState<LocationState>(readLocation);

  useEffect(() => {
    const update = () => setLocation(readLocation());

    window.addEventListener("popstate", update);
    window.addEventListener(NAVIGATION_EVENT, update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAVIGATION_EVENT, update);
    };
  }, []);

  return location;
}

export function usePathname() {
  return useLocationState().pathname;
}

export function useSearchParams() {
  const { search } = useLocationState();

  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
  };
}