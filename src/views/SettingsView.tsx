"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/lib/router";
import {
  Settings2, User, Shield, Bell, CreditCard, Lock,
} from "lucide-react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";

import GeneralTab from "@/components/settings/GeneralTab";
import AccountTab from "@/components/settings/AccountTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import BillingTab from "@/components/settings/BillingTab";
import PrivacyTab from "@/components/settings/PrivacyTab";

const TABS = [
  { id: "general", label: "General", icon: Settings2, path: "/settings" },
  { id: "account", label: "Account", icon: User, path: "/settings/account" },
  { id: "security", label: "Security", icon: Shield, path: "/settings/security" },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/settings/notifications" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/settings/billing" },
  { id: "privacy", label: "Privacy", icon: Lock, path: "/settings/privacy" },
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

function resolveTab(pathname: string): TabId {
  const segment = pathname.replace("/settings", "").replace("/", "");
  const match = TABS.find((t) => t.id === segment);
  return match ? match.id : "general";
}

const SettingsView = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(resolveTab(pathname || "/settings"));
  const isInitializing = false;

  // Sync state if pathname changes from outside (e.g., back/forward navigation)
  useEffect(() => {
    setActiveTab(resolveTab(pathname || "/settings"));
  }, [pathname]);

  const handleTabChange = (tab: typeof TABS[number]) => {
    if (tab.id === activeTab) return;
    setActiveTab(tab.id);
    router.push(tab.path);
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <BoneyardSkeleton
      loading={isInitializing}
      animate="shimmer"
      className="w-full h-full"
      fallback={
        <div className="flex h-full">
          <div className="w-56 shrink-0 p-6 space-y-3">
            <div className="w-24 h-8 rounded-md skeleton-shimmer mb-6" />
            {Array.from({ length: TABS.length }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg skeleton-shimmer" />
            ))}
          </div>
          <div className="flex-1 p-8 space-y-6">
            <div className="h-8 w-32 rounded-md skeleton-shimmer" />
            <div className="h-40 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
          </div>
        </div>
      }
    >
      <div className="flex h-full w-full animate-fade-up">
        <aside className="settings-sidebar custom-scrollbar">
          <h1 className="text-base font-heading font-semibold tracking-tight text-foreground px-3 mb-4 uppercase opacity-60">
            Settings
          </h1>
          <nav className="space-y-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
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

        <main className="settings-content custom-scrollbar">
          <div key={activeTab} className={`w-full animate-fade-up transition-opacity duration-150 opacity-100`}>
            <ActiveComponent />
          </div>
        </main>
      </div>
    </BoneyardSkeleton>
  );
};

export default SettingsView;
