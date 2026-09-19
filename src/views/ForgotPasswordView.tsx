"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordView() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not send reset email", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="sidebar" className="text-[22px]" />
        </div>
        <div className="bg-card/60 border border-border/40 rounded-2xl p-6 sm:p-8 shadow-sm">
          <a href="/auth" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 font-body">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </a>
          <h1 className="text-xl font-display text-foreground mb-1">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6 font-body">
            Enter your email and we'll send you a link to choose a new password.
          </p>

          {sent ? (
            <div className="text-sm font-body text-foreground bg-primary/5 border border-primary/20 rounded-lg p-4">
              If <span className="font-medium">{email}</span> has an account, a reset link is on its way. Check your inbox (and spam folder).
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input id="email-reset" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
