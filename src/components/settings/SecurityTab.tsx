"use client";

import { useState } from "react";
import { Key, Smartphone, Activity, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const SecurityTab = () => {
  const { toast } = useToast();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activityLog = [
    { event: "Successful login", time: "Today, 09:24 AM", ip: "103.21.xx.xx", status: "success" },
    { event: "Password changed", time: "Apr 8, 2026", ip: "103.21.xx.xx", status: "success" },
    { event: "Failed login attempt", time: "Apr 5, 2026", ip: "45.xx.xx.xx", status: "warning" },
    { event: "2FA enabled", time: "Mar 28, 2026", ip: "103.21.xx.xx", status: "success" },
  ];

  const backupCodes = [
    "A4F2-9K3L", "B7M1-X8P2", "C2N6-Y4Q9", "D8R3-Z1V7",
    "E5T8-W6S2", "F9U4-V3X8", "G1K7-H2J5", "H6L9-N4M1",
  ];

  const calcStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calcStrength(newPwd);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Excellent"][strength];
  const strengthColor = ["bg-muted", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-primary"][strength];

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (strength < 3) {
      toast({ title: "Weak password", description: "Choose a stronger password.", variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="space-y-0">
      {/* ── Password ── */}
      <section>
        <h2 className="settings-section-header">Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            {newPwd && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Strength: <span className="font-medium text-foreground">{strengthLabel}</span></p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <Button type="submit">Update password</Button>
        </form>
      </section>

      {/* ── 2FA ── */}
      <section className="settings-section-divider">
        <div className="flex items-center justify-between mb-4">
          <h2 className="settings-section-header mb-0">Two-Factor Authentication</h2>
          <Switch
            checked={twoFA}
            onCheckedChange={(c) => {
              setTwoFA(c);
              toast({ title: c ? "2FA enabled" : "2FA disabled", description: c ? "Scan the QR code with your authenticator." : "Two-factor authentication turned off." });
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security with TOTP-based authentication apps like Authy, 1Password or Google Authenticator.</p>

        {twoFA && (
          <div className="grid sm:grid-cols-[180px_1fr] gap-6 p-4 bg-surface-high border border-border/30 rounded-xl">
            <div className="aspect-square bg-foreground rounded-lg flex items-center justify-center p-3">
              <svg viewBox="0 0 100 100" className="w-full h-full text-background">
                <rect x="0" y="0" width="100" height="100" fill="currentColor" />
                {Array.from({ length: 10 }).map((_, r) =>
                  Array.from({ length: 10 }).map((_, c) => {
                    const filled = (r * 7 + c * 3) % 3 === 0;
                    return filled ? <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width="10" height="10" fill="hsl(var(--foreground))" /> : null;
                  })
                )}
              </svg>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Or enter manually</p>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">JBSW Y3DP EHPK 3PXP</code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verify with 6-digit code</Label>
                <div className="flex gap-2">
                  <Input id="otp" placeholder="000000" maxLength={6} className="max-w-[140px] font-mono tracking-widest" />
                  <Button variant="outline" onClick={() => toast({ title: "2FA verified", description: "Authenticator successfully linked." })}>Verify</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Backup codes ── */}
      {twoFA && (
        <section className="settings-section-divider">
          <div className="flex items-center justify-between mb-4">
            <h2 className="settings-section-header mb-0">Backup recovery codes</h2>
            <Button variant="outline" size="sm" onClick={() => setShowBackupCodes(!showBackupCodes)}>
              {showBackupCodes ? "Hide" : "Reveal"} codes
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Use these one-time codes if you lose access to your authenticator. Store them somewhere safe.</p>
          {showBackupCodes && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {backupCodes.map((code) => (
                <button
                  key={code}
                  onClick={() => copyCode(code)}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-high border border-border/30 rounded-lg font-mono text-xs hover:border-primary/40 transition-colors"
                >
                  <span>{code}</span>
                  {copiedCode === code ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Activity log ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Recent Security Activity</h2>
        <div className="space-y-1">
          {activityLog.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {a.status === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                ) : (
                  <Check className="w-4 h-4 text-primary" />
                )}
                <div>
                  <p className="text-sm text-foreground">{a.event}</p>
                  <p className="text-xs text-muted-foreground">{a.time} • {a.ip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SecurityTab;
