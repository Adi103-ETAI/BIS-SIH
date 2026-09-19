"use client";

import { useState } from "react";
import { Plus, Copy, Check, Trash2, Webhook, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
}

const ApiTab = () => {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: "1", name: "Production", key: "sk_live_oI4f...9k2P", created: "Mar 12, 2026", lastUsed: "2 min ago" },
    { id: "2", name: "Staging", key: "sk_test_xY8a...3mQ7", created: "Feb 28, 2026", lastUsed: "Yesterday" },
  ]);
  const [newName, setNewName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const generateKey = () => {
    if (!newName.trim()) {
      toast({ title: "Name required", description: "Give the key a memorable name.", variant: "destructive" });
      return;
    }
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: newName,
      key: `sk_live_${Math.random().toString(36).substring(2, 8)}...${Math.random().toString(36).substring(2, 6)}`,
      created: new Date().toLocaleDateString(),
      lastUsed: "Never",
    };
    setKeys([newKey, ...keys]);
    setNewName("");
    toast({ title: "API key created", description: "Copy and store it securely. You won't see the full key again." });
  };

  const revoke = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
    toast({ title: "Key revoked" });
  };

  return (
    <div className="space-y-0">
      {/* ── Usage ── */}
      <section>
        <h2 className="settings-section-header">Today's Usage</h2>
        <div className="grid grid-cols-3 gap-4 p-5 bg-surface-high border border-border/30 rounded-xl">
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">847</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Requests</p>
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">99.8%</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Success rate</p>
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-foreground">142ms</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg latency</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-muted-foreground">Rate limit</p>
            <p className="text-sm font-mono text-foreground">847 / 5,000 per day</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "17%" }} />
          </div>
        </div>
      </section>

      {/* ── Create key ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Create API Key</h2>
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <Input placeholder="Key name (e.g. Production server)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={generateKey}><Plus className="w-4 h-4 mr-1" /> Generate</Button>
        </div>
      </section>

      {/* ── Keys list ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Active Keys</h2>
        <div className="space-y-2">
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No API keys yet.</p>
          ) : keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-4 bg-surface-high border border-border/30 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{k.name}</p>
                <code className="text-xs font-mono text-muted-foreground">{k.key}</code>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Created {k.created} • Last used {k.lastUsed}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => copy(k.key, k.id)}>
                  {copied === k.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => revoke(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Webhooks ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Webhooks</h2>
        <p className="text-sm text-muted-foreground mb-4">Receive realtime POST callbacks when new citations match your saved queries.</p>
        <div className="space-y-2 max-w-xl">
          <Label>Endpoint URL</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-app.com/webhooks/bis-sih"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <Button variant="outline" onClick={() => toast({ title: "Webhook saved", description: "Test event sent." })}>
              Save
            </Button>
          </div>
        </div>
      </section>

      {/* ── Docs ── */}
      <section className="settings-section-divider">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="settings-section-header mb-1">API Documentation</h2>
            <p className="text-sm text-muted-foreground">Full reference for endpoints, auth and SDKs.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: "Docs", description: "Opening API reference." })}>
            View docs <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ApiTab;
