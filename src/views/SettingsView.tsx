"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/lib/router";
import {
  Settings2, User, Shield, Bell, CreditCard, Lock, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";

import GeneralTab from "@/components/settings/GeneralTab";
import AccountTab from "@/components/settings/AccountTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import BillingTab from "@/components/settings/BillingTab";
import PrivacyTab from "@/components/settings/PrivacyTab";

const TABS = [
  { id: "general",       label: "General",       icon: Settings2,  path: "/settings",               desc: "Theme, language, typography" },
  { id: "account",       label: "Account",       icon: User,       path: "/settings/account",       desc: "Profile, role, specialization" },
  { id: "security",      label: "Security",      icon: Shield,     path: "/settings/security",      desc: "Password, 2FA, sessions" },
  { id: "notifications", label: "Notifications", icon: Bell,       path: "/settings/notifications", desc: "Alerts and email digests" },
  { id: "billing",       label: "Billing",       icon: CreditCard, path: "/settings/billing",       desc: "Plan, usage, invoices" },
  { id: "privacy",       label: "Privacy",       icon: Lock,       path: "/settings/privacy",       desc: "Data export, retention" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  general: GeneralTab,
  account: AccountTab,
  security: SecurityTab,
  notifications: NotificationsTab,
  billing: BillingTab,
  privacy: PrivacyTab,
};

function resolveTab(pathname: string): TabId | null {
  const segment = pathname.replace("/settings", "").replace("/", "");
  if (!segment) return null;
  const match = TABS.find((t) => t.id === segment);
  return match ? match.id : null;
}

const SettingsView = () => {
  const pathname = usePathname();
  const router = useRouter();
  const resolved = resolveTab(pathname || "/settings");
  // On mobile we treat "/settings" (no sub-path) as the list view.
  const [activeTab, setActiveTab] = useState<TabId>(resolved ?? "general");
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(resolved !== null);

  useEffect(() => {
    const r = resolveTab(pathname || "/settings");
    setActiveTab(r ?? "general");
    setMobileShowDetail(r !== null);
  }, [pathname]);

  const handleTabChange = (tab: typeof TABS[number]) => {
    setActiveTab(tab.id);
    setMobileShowDetail(true);
    router.push(tab.path);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
    router.push("/settings");
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <BoneyardSkeleton
      loading={false}
      animate="shimmer"
      className="w-full h-full"
      fallback={<div className="w-full h-full skeleton-shimmer" />}
    >
      <div className="flex flex-col md:flex-row h-full w-full animate-fade-up">
        {/* ─── Desktop sidebar ─── */}
        <aside className="hidden md:flex settings-sidebar custom-scrollbar">
          <h1 className="text-base font-heading font-semibold tracking-tight text-foreground px-3 mb-4 uppercase opacity-60">
            Settings
          </h1>
          <nav className="space-y-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id && (mobileShowDetail || true);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`settings-nav-item ${isActive ? "active" : ""}`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ─── Mobile: drilldown UX ─── */}
        <div className="md:hidden flex-1 flex flex-col min-h-0 bg-background">
          {!mobileShowDetail ? (
            // List screen
            <div className="flex-1 overflow-y-auto animate-fade-up">
              <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md px-5 pt-6 pb-4 border-b border-border/30">
                <h1 className="text-2xl font-heading font-semibold tracking-tight text-foreground">
                  Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage your preferences
                </p>
              </header>

              <div className="px-4 py-5">
                <div className="rounded-2xl bg-card/60 border border-border/40 overflow-hidden divide-y divide-border/30 shadow-sm">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab)}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/60 transition-colors text-left"
                      >
                        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[0.95rem] font-medium text-foreground leading-tight">
                            {tab.label}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                            {tab.desc}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Detail screen
            <div className="flex-1 flex flex-col min-h-0 animate-slide-in-right">
              <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/30 px-2 py-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-0.5 px-2 py-2 rounded-lg text-primary active:bg-muted/60 transition-colors -ml-1"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.25} />
                  <span className="text-[0.95rem] font-medium">Settings</span>
                </button>
                <h2 className="absolute left-1/2 -translate-x-1/2 text-[0.95rem] font-semibold text-foreground pointer-events-none">
                  {activeMeta.label}
                </h2>
              </header>
              <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5">
                <div key={activeTab} className="animate-fade-up">
                  <ActiveComponent />
                </div>
              </main>
            </div>
          )}
        </div>

        {/* ─── Desktop content ─── */}
        <main className="hidden md:block settings-content custom-scrollbar flex-1">
          <div key={activeTab} className="w-full animate-fade-up">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </BoneyardSkeleton>
  );
};

export default SettingsView;
