"use client";

import Layout from "@/components/Layout";
import HelpView from "@/views/HelpView";
import IndexView from "@/views/IndexView";
import NotFoundView from "@/views/NotFoundView";
import SettingsView from "@/views/SettingsView";
import VaultView from "@/views/VaultView";
import Providers from "@/app/providers";
import { usePathname } from "@/lib/router";

function AppRoute() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "") {
    return <IndexView />;
  }

  if (pathname === "/vault") {
    return <VaultView />;
  }

  if (pathname.startsWith("/settings")) {
    return <SettingsView />;
  }

  if (pathname === "/help") {
    return <HelpView />;
  }

  return <NotFoundView />;
}

export default function App() {
  return (
    <Providers>
      <Layout>
        <AppRoute />
      </Layout>
    </Providers>
  );
}