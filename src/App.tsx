"use client";

import Layout from "@/components/Layout";
import HelpView from "@/views/HelpView";
import IndexView from "@/views/IndexView";
import NotFoundView from "@/views/NotFoundView";
import SettingsView from "@/views/SettingsView";
import VaultView from "@/views/VaultView";
import AuthView from "@/views/AuthView";
import ForgotPasswordView from "@/views/ForgotPasswordView";
import ResetPasswordView from "@/views/ResetPasswordView";
import Providers from "@/app/providers";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePathname } from "@/lib/router";

function AppRoute() {
  const pathname = usePathname();

  if (pathname === "/auth") return <AuthView />;
  if (pathname === "/auth/forgot-password") return <ForgotPasswordView />;
  if (pathname === "/auth/reset-password") return <ResetPasswordView />;

  if (pathname === "/" || pathname === "") {
    return (
      <Layout>
        <IndexView />
      </Layout>
    );
  }

  if (pathname === "/vault") {
    return (
      <Layout>
        <ProtectedRoute>
          <VaultView />
        </ProtectedRoute>
      </Layout>
    );
  }

  if (pathname.startsWith("/settings")) {
    return (
      <Layout>
        <ProtectedRoute>
          <SettingsView />
        </ProtectedRoute>
      </Layout>
    );
  }

  if (pathname === "/help") {
    return (
      <Layout>
        <HelpView />
      </Layout>
    );
  }

  return (
    <Layout>
      <NotFoundView />
    </Layout>
  );
}

export default function App() {
  return (
    <Providers>
      <AppRoute />
    </Providers>
  );
}
