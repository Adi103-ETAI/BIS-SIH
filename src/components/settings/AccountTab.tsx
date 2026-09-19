"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/lib/router";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AccountTab = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [busy, setBusy] = useState(false);

  const userId = user?.id ?? "Not signed in";

  const copyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Logged out" });
    router.replace("/auth");
  };

  const handleDelete = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-account");
    setBusy(false);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as { error?: string })?.error) {
      toast({ title: "Failed to delete", description: (data as { error: string }).error, variant: "destructive" });
      return;
    }
    await signOut();
    toast({ title: "Account deleted" });
    router.replace("/");
  };

  return (
    <div className="space-y-0">
      <section>
        <h2 className="settings-section-header">Account</h2>
        <div className="space-y-1">
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} disabled={!user}>
              Sign out
            </Button>
          </div>

          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Delete your account</p>
              <p className="text-xs text-muted-foreground">Permanently erase your profile, consultations and vault.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" disabled={!user}>
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently erase your profile, all consultations, vault items and subscriptions.
                    Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE to confirm" />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "DELETE" || busy}
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {busy ? "Deleting…" : "Delete forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">User ID</p>
            </div>
            <button
              onClick={copyId}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border border-border/40 text-xs font-mono text-muted-foreground hover:bg-muted transition-colors"
            >
              <span className="truncate max-w-[280px]">{userId}</span>
              {copiedId ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccountTab;
