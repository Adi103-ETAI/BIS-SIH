"use client";

import { CreditCard, Check, Download, Zap, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

const BillingTab = () => {
  const { toast } = useToast();
  const { history, vaultItems } = useStore();

  const queriesUsed = history.length;
  const queriesLimit = 500;
  const queriesPercent = Math.min(100, (queriesUsed / queriesLimit) * 100);
  const vaultUsed = vaultItems.length;
  const vaultLimit = 200;
  const vaultPercent = Math.min(100, (vaultUsed / vaultLimit) * 100);

  const plans = [
    { name: "Free", price: "$0", features: ["50 queries / month", "20 vault items", "Standard sources", "Community support"], current: false },
    { name: "Pro", price: "$29", per: "/mo", features: ["500 queries / month", "200 vault items", "All medical sources", "Priority support", "Export to PDF"], current: true, badge: "Current" },
    { name: "Enterprise", price: "Custom", features: ["Unlimited queries", "Unlimited vault", "API access", "SSO + audit logs", "Dedicated CSM"], current: false },
  ];

  const invoices = [
    { id: "INV-2026-04", date: "Apr 1, 2026", amount: "$29.00", status: "Paid" },
    { id: "INV-2026-03", date: "Mar 1, 2026", amount: "$29.00", status: "Paid" },
    { id: "INV-2026-02", date: "Feb 1, 2026", amount: "$29.00", status: "Paid" },
    { id: "INV-2026-01", date: "Jan 1, 2026", amount: "$29.00", status: "Paid" },
  ];

  return (
    <div className="space-y-0">
      {/* ── Current plan ── */}
      <section>
        <h2 className="settings-section-header">Current Plan</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-high border border-border/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-heading font-semibold text-foreground">Pro Plan</h3>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">$29/month • Renews May 1, 2026</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Plan paused", description: "Your subscription will pause at the end of the cycle." })}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => toast({ title: "Upgrade", description: "Contact sales for Enterprise pricing." })}>
              Upgrade
            </Button>
          </div>
        </div>
      </section>

      {/* ── Usage ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Usage This Month</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-high border border-border/30 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">Consultations</p>
              <p className="text-sm font-mono text-foreground">{queriesUsed}<span className="text-muted-foreground"> / {queriesLimit}</span></p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${queriesPercent}%` }} />
            </div>
          </div>
          <div className="p-4 bg-surface-high border border-border/30 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-muted-foreground">Vault items</p>
              <p className="text-sm font-mono text-foreground">{vaultUsed}<span className="text-muted-foreground"> / {vaultLimit}</span></p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${vaultPercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Compare Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-5 rounded-xl border-2 transition-all ${
                plan.current ? "border-primary bg-primary/5" : "border-border/40 bg-surface-high hover:border-primary/30"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2 left-4 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-sm font-heading font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 mb-4 flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{plan.price}</span>
                {plan.per && <span className="text-xs text-muted-foreground">{plan.per}</span>}
              </p>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.current ? "outline" : "default"}
                size="sm"
                disabled={plan.current}
                className="w-full"
                onClick={() => toast({ title: `Switch to ${plan.name}`, description: "Plan change initiated." })}
              >
                {plan.current ? "Current plan" : `Switch to ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payment methods ── */}
      <section className="settings-section-divider">
        <div className="flex items-center justify-between mb-4">
          <h2 className="settings-section-header mb-0">Payment Method</h2>
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Add card", description: "Open Stripe payment dialog." })}>
            <Plus className="w-4 h-4 mr-1" /> Add card
          </Button>
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-high border border-border/30 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-foreground rounded flex items-center justify-center">
              <span className="text-[10px] font-bold text-background">VISA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expires 08/2027</p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Default</span>
        </div>
      </section>

      {/* ── Invoices ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Invoice History</h2>
        <div className="space-y-0">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3 border-b border-border/15 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{inv.id}</p>
                <p className="text-xs text-muted-foreground">{inv.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-foreground">{inv.amount}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{inv.status}</span>
                <Button variant="ghost" size="icon" onClick={() => toast({ title: "Download started", description: `${inv.id}.pdf` })}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BillingTab;
