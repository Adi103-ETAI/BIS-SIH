"use client";

import { useState } from "react";
import { Mail, BellRing, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const NotificationsTab = () => {
  const { toast } = useToast();
  const [digestFreq, setDigestFreq] = useState("weekly");
  const [sources, setSources] = useState({ icmr: true, cdc: true, who: true, nice: false });
  const [alerts, setAlerts] = useState({ newCitations: true, guidelineUpdates: true, vaultMatches: false });
  const [quietHours, setQuietHours] = useState(true);
  const [quietStart, setQuietStart] = useState("22");
  const [quietEnd, setQuietEnd] = useState("07");
  const [pushEnabled, setPushEnabled] = useState(false);

  const requestPush = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Not supported", description: "This browser does not support push notifications.", variant: "destructive" });
      return;
    }
    const result = await Notification.requestPermission();
    setPushEnabled(result === "granted");
    toast({ title: result === "granted" ? "Push enabled" : "Push denied", description: result === "granted" ? "You'll get realtime alerts." : "Enable from browser settings." });
  };

  return (
    <div className="space-y-0">
      {/* ── Email ── */}
      <section>
        <h2 className="settings-section-header">Email Preferences</h2>
        <div className="space-y-5">
          <div className="space-y-2 max-w-sm">
            <Label>Digest frequency</Label>
            <Select value={digestFreq} onValueChange={(v) => { setDigestFreq(v); toast({ title: "Saved" }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 pt-3 border-t border-border/30">
            <Label>Guidance sources</Label>
            {([
              { key: "icmr", label: "ICMR (India)", desc: "Indian Council of Medical Research" },
              { key: "cdc", label: "CDC (USA)", desc: "Centers for Disease Control and Prevention" },
              { key: "who", label: "WHO (Global)", desc: "World Health Organization" },
              { key: "nice", label: "NICE (UK)", desc: "National Institute for Health and Care Excellence" },
            ] as const).map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <Switch checked={sources[s.key]} onCheckedChange={(c) => setSources({ ...sources, [s.key]: c })} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alert types ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Alert Types</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New citations matching saved queries</p>
              <p className="text-xs text-muted-foreground">When fresh papers match your vault topics.</p>
            </div>
            <Switch checked={alerts.newCitations} onCheckedChange={(c) => setAlerts({ ...alerts, newCitations: c })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Guideline updates in your specialty</p>
              <p className="text-xs text-muted-foreground">Major revisions to clinical guidelines.</p>
            </div>
            <Switch checked={alerts.guidelineUpdates} onCheckedChange={(c) => setAlerts({ ...alerts, guidelineUpdates: c })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Vault item activity</p>
              <p className="text-xs text-muted-foreground">Comments, exports and shared access.</p>
            </div>
            <Switch checked={alerts.vaultMatches} onCheckedChange={(c) => setAlerts({ ...alerts, vaultMatches: c })} />
          </div>
        </div>
      </section>

      {/* ── Quiet hours ── */}
      <section className="settings-section-divider">
        <div className="flex items-center justify-between mb-4">
          <h2 className="settings-section-header mb-0">Quiet Hours</h2>
          <Switch checked={quietHours} onCheckedChange={setQuietHours} />
        </div>
        {quietHours && (
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={quietStart} onValueChange={setQuietStart}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={quietEnd} onValueChange={setQuietEnd}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>

      {/* ── Push ── */}
      <section className="settings-section-divider">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="settings-section-header mb-1">Browser push notifications</h2>
            <p className="text-sm text-muted-foreground">Get realtime alerts in your browser.</p>
          </div>
          <Button variant={pushEnabled ? "outline" : "default"} onClick={requestPush}>
            {pushEnabled ? "Enabled" : "Enable"}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default NotificationsTab;
