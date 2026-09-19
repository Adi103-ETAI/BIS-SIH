import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Layout from "@/components/Layout";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "BIS-SIH",
  description: "Clinical research assistant with cited answers",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#caf0f8" },
    { media: "(prefers-color-scheme: dark)", color: "#03045e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
