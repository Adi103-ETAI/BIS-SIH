"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]!));
  return `sk_live_${b64}`;
}

const ApiTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [newlyCreated, setNewlyCreated] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setKeys([]); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setKeys(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const generateKey = async () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (!newName.trim()) { toast({ title: "Name required", description: "Give the key a memorable name.", variant: "destructive" }); return; }
    const secret = generateSecret();
    const hash = await sha256Hex(secret);
    const prefix = secret.slice(0, 12);
    const { data, error } = await supabase
      .from("api_keys")
      .insert({ user_id: user.id, name: newName.trim(), key_hash: hash, key_prefix: prefix })
      .select("id, name, key_prefix, created_at, last_used_at")
      .single();
    if (error || !data) {
      toast({ title: "Failed to create key", description: error?.message, variant: "destructive" });
      return;
    }
    setKeys((prev) => [data, ...prev]);
    setNewName("");
    setNewlyCreated(secret);
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) { toast({ title: "Failed to revoke", description: error.message, variant: "destructive" }); return; }
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast({ title: "Key revoked" });
  };

  return (
    <div className="space-y-0">
      <section>
        <h2 className="settings-section-header">Create API Key</h2>
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <Input placeholder="Key name (e.g. Production server)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={generateKey} disabled={!user}><Plus className="w-4 h-4 mr-1" /> Generate</Button>
        </div>
        {!user && <p className="text-xs text-muted-foreground mt-2">Sign in to manage API keys.</p>}
      </section>

      <section className="settings-section-divider">
        <h2 className="settings-section-header">Active Keys</h2>
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No API keys yet.</p>
          ) : keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-4 bg-surface-high border border-border/30 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{k.name}</p>
                <code className="text-xs font-mono text-muted-foreground">{k.key_prefix}…</code>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Created {new Date(k.created_at).toLocaleDateString()} • Last used {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => copy(k.key_prefix, k.id)}>
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

      <section className="settings-section-divider">
        <h2 className="settings-section-header">Webhooks</h2>
        <p className="text-sm text-muted-foreground mb-4">Receive realtime POST callbacks when new citations match your saved queries.</p>
        <div className="space-y-2 max-w-xl">
          <Label>Endpoint URL</Label>
          <div className="flex gap-2">
            <Input placeholder="https://your-app.com/webhooks/bis-sih" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <Button variant="outline" onClick={() => toast({ title: "Webhook saved" })}>Save</Button>
          </div>
        </div>
      </section>

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

      {/* Newly created key dialog */}
      <Dialog open={!!newlyCreated} onOpenChange={(open) => !open && setNewlyCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy this key now — you won't be able to see it again. Store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-xs break-all">
            {newlyCreated}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (newlyCreated) {
                  navigator.clipboard.writeText(newlyCreated);
                  toast({ title: "Copied to clipboard" });
                }
                setNewlyCreated(null);
              }}
            >
              Copy & close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiTab;
