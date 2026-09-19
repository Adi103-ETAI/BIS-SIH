"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

export default function ResetPasswordView() {
  const { toast } = useToast();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase client auto-parses the recovery token from the URL hash.
    // Wait for either a PASSWORD_RECOVERY event or an existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You're now signed in with your new password." });
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="sidebar" className="text-[22px]" />
        </div>
        <div className="bg-card/60 border border-border/40 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-xl font-display text-foreground mb-1">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mb-6 font-body">
            Pick something at least 8 characters long.
          </p>

          {!ready ? (
            <p className="text-sm text-muted-foreground font-body">Verifying reset link…</p>
          ) : !validSession ? (
            <div className="text-sm font-body text-foreground bg-destructive/5 border border-destructive/30 rounded-lg p-4">
              This reset link is invalid or has expired. <a href="/auth/forgot-password" className="text-primary underline">Request a new one</a>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pwd">New password</Label>
                <Input id="new-pwd" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirm password</Label>
                <Input id="confirm-pwd" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
