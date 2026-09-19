"use client";

import { useState } from "react";
import { Copy, Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AccountTab = () => {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [copiedOrgId, setCopiedOrgId] = useState(false);

  const orgId = "705b1b1f-cf13-4167-8a39-53acd5500795";

  const sessions = [
    { id: "1", device: "Chrome (Windows)", location: "Pune, Maharashtra, IN", created: "Apr 5, 2026, 8:21 PM", updated: "Apr 18, 2026, 6:53 PM", current: true },
    { id: "2", device: "Chrome (Windows)", location: "Pune, Maharashtra, IN", created: "Feb 19, 2026, 4:32 PM", updated: "Mar 30, 2026, 11:09 PM", current: false },
  ];

  const copyOrgId = () => {
    navigator.clipboard.writeText(orgId);
    setCopiedOrgId(true);
    setTimeout(() => setCopiedOrgId(false), 1500);
  };

  return (
    <div className="space-y-0">
      {/* ── Account ── */}
      <section>
        <h2 className="settings-section-header">Account</h2>

        <div className="space-y-1">
          {/* Log out */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Log out of all devices</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: "Logged out", description: "All other sessions have been revoked." })}
            >
              Log out
            </Button>
          </div>

          {/* Delete account */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Delete your account</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
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
                    disabled={confirmText !== "DELETE"}
                    onClick={() => toast({ title: "Account scheduled for deletion", description: "You have 30 days to cancel.", variant: "destructive" })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Organization ID */}
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Organization ID</p>
            </div>
            <button
              onClick={copyOrgId}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border border-border/40 text-xs font-mono text-muted-foreground hover:bg-muted transition-colors"
            >
              <span>{orgId}</span>
              {copiedOrgId ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </section>

      {/* ── Active sessions ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Active sessions</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 pr-4 text-xs font-semibold text-foreground uppercase tracking-wider">Device</th>
                <th className="text-left py-3 pr-4 text-xs font-semibold text-foreground uppercase tracking-wider">Location</th>
                <th className="text-left py-3 pr-4 text-xs font-semibold text-foreground uppercase tracking-wider">Created</th>
                <th className="text-left py-3 pr-4 text-xs font-semibold text-foreground uppercase tracking-wider">Updated</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border/15 last:border-0">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.device}</span>
                      {s.current && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{s.location}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{s.created}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{s.updated}</td>
                  <td className="py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                          onClick={() => {
                            if (!s.current) {
                              toast({ title: "Session revoked", description: `${s.device} has been logged out.` });
                            } else {
                              toast({ title: "Logged out", description: "You have been logged out of this session." });
                            }
                          }}
                        >
                          {s.current ? "Log out" : "Revoke session"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AccountTab;
