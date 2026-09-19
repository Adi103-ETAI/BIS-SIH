import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Layout from "@/components/Layout";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "BIS-SIH",
  description: "Clinical research assistant with cited answers",
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
