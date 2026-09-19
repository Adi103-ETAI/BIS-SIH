"use client";

import { useState } from "react";
import { HelpCircle, Keyboard, BookOpen, MessageSquare, Sparkles, Search, ArrowLeft } from "lucide-react";
import AppLink from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

const HelpView = () => {
  const { toast } = useToast();
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [search, setSearch] = useState("");

  const shortcuts = [
    { keys: ["Ctrl", "K"], desc: "Open quick search" },
    { keys: ["Ctrl", "N"], desc: "New chat" },
    { keys: ["Ctrl", "/"], desc: "Toggle sidebar" },
    { keys: ["Ctrl", "S"], desc: "Save citation to vault" },
    { keys: ["Esc"], desc: "Close any panel or dialog" },
    { keys: ["?"], desc: "Show shortcut reference" },
  ];

  const faqs = [
    { q: "How accurate are the citations?", a: "Every answer cites official sources from Indian Standards, ISO/IEC documents and BIS publications. Always cross-check with the original standard before compliance decisions." },
    { q: "Can I use this for product certification?", a: "BIS Chat is a research and reference tool, not a certification authority. Use it to inform your decisions, but certification is granted only by BIS through the official process." },
    { q: "How do I save sources for later?", a: "Click the bookmark icon on any citation card to save it to your Standards Vault. Vault items persist across sessions." },
    { q: "Is my query data private?", a: "Yes. Queries are encrypted at rest, never shared with third parties, and you can export or delete all data from Privacy settings." },
    { q: "Which product sectors are covered?", a: "All major sectors including electrical & electronics, food & agriculture, textiles, chemicals, construction, and mechanical engineering." },
    { q: "Can I get an institutional plan?", a: "Yes, contact sales for organization-wide licenses with SSO and audit logging." },
  ];

  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  const changelog = [
    { version: "v2.4", date: "Apr 12, 2026", items: ["Sources now open in slide-out panel", "Smooth font switching", "Fixed conversation history loading"] },
    { version: "v2.3", date: "Apr 1, 2026", items: ["Added Standards Vault for saved citations", "BIS catalogue integration"] },
    { version: "v2.2", date: "Mar 15, 2026", items: ["New BIS ocean theme", "Improved citation formatting"] },
  ];

  const submitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Support ticket submitted", description: "We'll respond within 24 hours." });
    setSupportSubject(""); setSupportBody("");
  };

  return (
    <div className="w-full max-w-4xl xl:max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-fade-up">
      <AppLink
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Settings
      </AppLink>

      <div className="flex items-start gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary"><HelpCircle className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">
            Help &amp; Support
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Guides, shortcuts and direct support for standards professionals.</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Quick Start</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { n: "1", t: "Ask a standards question", d: "Be specific: include the IS number, product category and what you want to know." },
              { n: "2", t: "Review the cited sources", d: "Click superscripts or the Sources button to inspect every reference." },
              { n: "3", t: "Save to your vault", d: "Bookmark high-value citations so they're one click away later." },
            ].map((s) => (
              <div key={s.n} className="p-4 bg-background/40 border border-border/30 rounded-xl">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary font-mono text-sm font-semibold mb-2">{s.n}</span>
                <p className="text-sm font-semibold text-foreground">{s.t}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {shortcuts.map((s) => (
              <div key={s.desc} className="flex items-center justify-between py-2 px-3 bg-background/40 border border-border/30 rounded-lg">
                <span className="text-sm text-foreground">{s.desc}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="px-2 py-0.5 text-xs font-mono bg-muted border border-border/40 rounded">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No matches.</p>
          ) : (
            <Accordion type="single" collapsible>
              {filtered.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>

        <section className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-4">What's New</h2>
          <div className="space-y-5">
            {changelog.map((c) => (
              <div key={c.version}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm font-semibold text-primary font-mono">{c.version}</span>
                  <span className="text-xs text-muted-foreground">{c.date}</span>
                </div>
                <ul className="space-y-1 text-sm text-foreground/80 pl-3">
                  {c.items.map((item) => (
                    <li key={item} className="list-disc list-inside">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 bg-surface-high border border-border/50 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
          </div>
          <form onSubmit={submitSupport} className="space-y-3 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Describe the issue</Label>
              <Textarea id="body" rows={5} value={supportBody} onChange={(e) => setSupportBody(e.target.value)} required />
            </div>
            <Button type="submit">Send to support</Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default HelpView;
