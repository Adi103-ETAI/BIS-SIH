"use client";

import { useState } from "react";
import { Download, Trash2, Clock, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

const PrivacyTab = () => {
  const { toast } = useToast();
  const { history, vaultItems, clearHistory } = useStore();
  const [retention, setRetention] = useState("90");
  const [analytics, setAnalytics] = useState(true);
  const [anonymize, setAnonymize] = useState(false);

  const downloadJSON = () => {
    const data = { exportedAt: new Date().toISOString(), history, vaultItems };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bis-sih-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Your data has been downloaded." });
  };

  return (
    <div className="space-y-0">
      {/* ── Privacy header ── */}
      <section>
        <h2 className="settings-section-header">Privacy</h2>
        <p className="text-sm text-muted-foreground mb-3">
          BIS Chat believes in transparent data practices. Learn how your information is protected when using our products.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <button className="text-sm text-primary hover:underline">How we protect your data ›</button>
          <button className="text-sm text-primary hover:underline">How we use your data ›</button>
        </div>
      </section>

      {/* ── Privacy settings ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Privacy settings</h2>

        <div className="space-y-1">
          {/* Export */}
          <div className="settings-row">
            <p className="text-sm font-medium text-foreground">Export data</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadJSON}>
                Export data
              </Button>
            </div>
          </div>

          {/* Retention */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Data retention</p>
              <p className="text-xs text-muted-foreground">Auto-delete query history after a set period</p>
            </div>
            <Select value={retention} onValueChange={(v) => { setRetention(v); toast({ title: "Retention updated", description: `History will auto-delete after ${v} days.` }); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analytics */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Product analytics</p>
              <p className="text-xs text-muted-foreground">Help improve BIS Chat with anonymized usage data.</p>
            </div>
            <Switch checked={analytics} onCheckedChange={(c) => { setAnalytics(c); toast({ title: "Saved" }); }} />
          </div>

          {/* Anonymize */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Anonymize personal identifiers</p>
              <p className="text-xs text-muted-foreground">Strip names and contact details from saved queries automatically.</p>
            </div>
            <Switch checked={anonymize} onCheckedChange={(c) => { setAnonymize(c); toast({ title: "Saved" }); }} />
          </div>
        </div>
      </section>

      {/* ── Clear history ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Clear query history</h2>
        <p className="text-sm text-muted-foreground mb-4">Permanently remove all {history.length} chats. Vault items remain.</p>
        <Button variant="outline" onClick={() => { clearHistory(); toast({ title: "History cleared" }); }}>
          <Trash2 className="w-4 h-4 mr-2" /> Clear all history
        </Button>
      </section>
    </div>
  );
};

export default PrivacyTab;
