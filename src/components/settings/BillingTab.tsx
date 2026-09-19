"use client";

import { useEffect, useState } from "react";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  plan: "free" | "pro";
  status: string;
  current_period_end: string | null;
}

const BillingTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { history, vaultItems } = useStore();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [periodCount, setPeriodCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (subData) setSub(subData as Subscription);

      const since = new Date();
      since.setDate(1); since.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("query_history")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString());
      setPeriodCount(count ?? 0);
    })();
  }, [user]);

  const plan = sub?.plan ?? "free";
  const limits = plan === "pro"
    ? { queries: 500, vault: 200, price: "$29", per: "/mo" }
    : { queries: 50, vault: 20, price: "$0", per: "" };

  const queriesUsed = user ? periodCount : history.length;
  const queriesPercent = Math.min(100, (queriesUsed / limits.queries) * 100);
  const vaultUsed = vaultItems.length;
  const vaultPercent = Math.min(100, (vaultUsed / limits.vault) * 100);

  const plans = [
    { name: "Free", price: "$0", features: ["50 queries / month", "20 vault items", "Standard sources", "Community support"], key: "free" },
    { name: "Pro", price: "$29", per: "/mo", features: ["500 queries / month", "200 vault items", "All medical sources", "Priority support", "Export to PDF"], key: "pro" },
    { name: "Enterprise", price: "Custom", features: ["Unlimited queries", "Unlimited vault", "API access", "SSO + audit logs", "Dedicated CSM"], key: "enterprise" },
  ];

  return (
    <div className="space-y-0">
      <section>
        <h2 className="settings-section-header">Current Plan</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-high border border-border/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-heading font-semibold text-foreground capitalize">{plan} Plan</h3>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                  {sub?.status ?? "Active"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {limits.price}{limits.per}
                {sub?.current_period_end && ` • Renews ${new Date(sub.current_period_end).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => toast({ title: "Coming soon", description: "Billing checkout is being set up." })}>
              {plan === "free" ? "Upgrade" : "Manage"}
            </Button>
          </div>
        </div>
      </section>

      <section className="settings-section-divider">
        <h2 className="settings-section-header">Usage This Month</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-high border border-border/30 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">Consultations</p>
              <p className="text-sm font-mono text-foreground">{queriesUsed} / {limits.queries}</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${queriesPercent}%` }} />
            </div>
          </div>
          <div className="p-4 bg-surface-high border border-border/30 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">Vault items</p>
              <p className="text-sm font-mono text-foreground">{vaultUsed} / {limits.vault}</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${vaultPercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section-divider">
        <h2 className="settings-section-header">Plans</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isCurrent = p.key === plan;
            return (
              <div key={p.name} className={`p-4 rounded-xl border ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border/30 bg-surface-high"}`}>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-base font-heading font-semibold text-foreground">{p.name}</h3>
                  {isCurrent && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Current</span>}
                </div>
                <p className="text-2xl font-bold text-foreground mb-3">{p.price}<span className="text-sm text-muted-foreground font-normal">{p.per ?? ""}</span></p>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  size="sm"
                  disabled={isCurrent}
                  className="w-full"
                  onClick={() => toast({ title: "Coming soon", description: "Billing checkout is being set up." })}
                >
                  {isCurrent ? "Current plan" : p.key === "enterprise" ? "Contact sales" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default BillingTab;
