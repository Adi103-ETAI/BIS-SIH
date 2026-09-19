"use client";

import { AnchorHTMLAttributes, forwardRef } from "react";
import { useRouter } from "@/lib/router";

interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
}

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ href, onClick, replace, target, ...props }, ref) => {
    const router = useRouter();

    return (
      <a
        ref={ref}
        href={href}
        target={target}
        onClick={(event) => {
          onClick?.(event);
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            target ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
          ) {
            return;
          }

          event.preventDefault();
          if (replace) {
            router.replace(href);
          } else {
            router.push(href);
          }
        }}
        {...props}
      />
    );
  },
);

AppLink.displayName = "AppLink";

export default AppLink;