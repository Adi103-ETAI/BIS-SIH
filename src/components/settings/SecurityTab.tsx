"use client";

import { useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SecurityTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      toast({ title: "Not signed in", description: "Sign in to change your password.", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (strength < 3) {
      toast({ title: "Weak password", description: "Choose a stronger password (mix letters, numbers, symbols).", variant: "destructive" });
      return;
    }

    setBusy(true);

    // Re-verify current password by attempting a sign-in. This invalidates any
    // wrong-password attempt without changing the active session.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPwd,
    });
    if (verifyError) {
      setBusy(false);
      toast({ title: "Current password incorrect", description: verifyError.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setBusy(false);

    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="space-y-0">
      {/* ── Password ── */}
      <section>
        <h2 className="settings-section-header">Password</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Change the password used to sign in to BIS-SIH. If you signed in with Google, set a password here to also enable email sign-in.
        </p>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" required value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" required minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
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
            <Input id="confirm" type="password" required minLength={8} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
        </form>
      </section>

      {/* ── 2FA (coming soon) ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Two-Factor Authentication</h2>
        <div className="flex items-start gap-3 p-4 bg-surface-high border border-border/30 rounded-xl max-w-md">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">
              TOTP-based 2FA (Authy, 1Password, Google Authenticator) will be available in a future release.
            </p>
          </div>
        </div>
      </section>

      {/* ── Activity log (placeholder) ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Recent Security Activity</h2>
        <div className="text-sm text-muted-foreground py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          Audit log will appear here once activity tracking is enabled.
        </div>
      </section>
    </div>
  );
};

export default SecurityTab;
