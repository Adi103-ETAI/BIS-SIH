"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, BookOpen, RefreshCw, Share2, Bookmark, Check } from "lucide-react";
import type { Citation, QueryResponse, SourceType } from "@/types/api";
import { getSourceConfig } from "@/lib/sources";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

interface AnswerCardProps {
  data: QueryResponse;
  onRegenerate?: () => void;
  onOpenSources?: (citations: Citation[], queryContext: string) => void;
}

const AnswerCard = ({ data, onRegenerate, onOpenSources }: AnswerCardProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { saveToVault, isInVault } = useStore();

  const uniqueSources = [...new Set(data.citations.map((c) => c.source_type))] as SourceType[];

  // Without remark-gfm, pipe tables would render as raw text. Wrap them in a
  // fenced block so they display as a neat monospaced block until GFM lands.
  const renderableAnswer = (() => {
    const lines = data.answer.split("\n");
    const out: string[] = [];
    let inFence = false;
    let i = 0;
    const isPipeRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
    const isDelimiter = (l: string) => /^\s*\|?[\s:|-]+\|?[\s:|-]*\|\s*$/.test(l) && /-/.test(l);
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        out.push(line);
        i++;
        continue;
      }
      if (!inFence && isPipeRow(line) && i + 1 < lines.length && isDelimiter(lines[i + 1])) {
        out.push("```text");
        while (i < lines.length && (isPipeRow(lines[i]) || /^\s*$/.test(lines[i]))) {
          if (isPipeRow(lines[i])) out.push(lines[i].trim());
          i++;
        }
        out.push("```");
        continue;
      }
      out.push(line);
      i++;
    }
    return out.join("\n");
  })();

  // Replace [N] with markdown superscript links (no raw HTML)
  const processedAnswer = renderableAnswer.replace(
    /\[(\d+)\]/g,
    (_, num) => `[${num}](#citation-${num})`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(data.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: "Copied to clipboard" });
  };

  const handleShare = async () => {
    const shareText = `${data.query}\n\n${data.answer}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "BIS Chat Answer", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Share link copied", description: "Answer copied to clipboard." });
      }
    } catch {
      // User canceled share — silently ignore
    }
  };

  const firstCitation = data.citations[0];
  const alreadySaved = firstCitation
    ? isInVault(firstCitation.title, firstCitation.chunk_text)
    : false;

  const handleSaveAll = () => {
    if (!firstCitation) {
      toast({ title: "Nothing to save", description: "This answer has no citations." });
      return;
    }
    let added = 0;
    data.citations.forEach((c) => {
      if (!isInVault(c.title, c.chunk_text)) {
        saveToVault({
          title: c.title,
          sourceType: c.source_type,
          chunkText: c.chunk_text,
          score: c.score,
          queryContext: data.query,
          mongoId: c.mongo_id,
        });
        added++;
      }
    });
    toast({
      title: added > 0 ? "Saved to Vault" : "Already in Vault",
      description: added > 0 ? `${added} citation${added > 1 ? "s" : ""} added.` : "These citations are already saved.",
    });
  };

  return (
    <div className="w-full animate-fade-up">
      {/* Source badges */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {uniqueSources.map((src) => {
          const config = getSourceConfig(src);
          return (
            <span
              key={src}
              className={`text-[10px] font-medium font-body px-2.5 py-0.5 rounded-full text-white ${config.colorClass}`}
            >
              {config.label}
            </span>
          );
        })}
      </div>

      {/* Editorial answer body */}
      <div className="prose-journal text-[14px] sm:text-[15.5px] font-body leading-[1.7] max-w-none">
        <ReactMarkdown
          components={{
            a: ({ children, href, ...props }) => {
              const isCitation = href?.startsWith('#citation-');
              if (isCitation) {
                const label = String(children);
                return (
                  <a
                    {...props}
                    href={href}
                    className="no-underline"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenSources?.(data.citations, data.query);
                    }}
                  >
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] mx-[1px] rounded-full bg-primary/12 text-primary text-[10px] font-semibold leading-none relative -top-[9px] hover:bg-primary/20 hover:text-primary-hover transition-colors cursor-pointer">
                      {label}
                    </span>
                  </a>
                );
              }
              return (
                <a
                  {...props}
                  href={href}
                  className="text-primary hover:text-primary-hover no-underline transition-colors"
                >
                  {children}
                </a>
              );
            },
            h1: ({ children }) => (
              <h1 className="font-heading text-[24px] font-medium text-foreground leading-[1.2] mt-6 mb-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="font-heading text-[20px] font-medium text-foreground leading-[1.25] mt-5 mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-heading text-[17px] font-medium text-foreground leading-[1.3] mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-foreground/90 my-2.5 first:mt-0 last:mb-0">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 my-2.5 space-y-1.5 marker:text-primary">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 my-2.5 space-y-1.5 marker:text-primary marker:font-semibold">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-foreground/90 leading-[1.7]">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/40 pl-4 my-3 italic text-muted-foreground">{children}</blockquote>
            ),
            pre: ({ children }) => (
              <pre className="bg-muted/60 border border-border/60 rounded-lg p-3.5 my-3 overflow-x-auto text-[13px] leading-[1.6] custom-scrollbar">{children}</pre>
            ),
            code: ({ children, className }) => {
              const isBlock = !!className;
              return isBlock ? (
                <code className="font-mono text-foreground/90">{children}</code>
              ) : (
                <code className="font-mono text-[0.85em] bg-muted/70 border border-border/50 rounded px-1.5 py-0.5 text-foreground">{children}</code>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            hr: () => <hr className="border-border/60 my-4" />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 rounded-lg border border-border/60 custom-scrollbar">
                <table className="w-full text-[13.5px] border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
            th: ({ children }) => (
              <th className="text-left font-semibold text-foreground px-3 py-2 border-b border-border/60 whitespace-nowrap">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 border-b border-border/40 text-foreground/90">{children}</td>
            ),
          }}
        >
          {processedAnswer}
        </ReactMarkdown>
      </div>

      {/* Action toolbar */}
      <div className="flex items-center gap-1 mt-5 pt-3 border-t border-border/50 flex-wrap">
        <button
          onClick={handleCopy}
          aria-label="Copy answer"
          title="Copy answer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.05em] font-body font-medium text-secondary/70 hover:text-primary hover:bg-primary/8 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            aria-label="Regenerate answer"
            title="Regenerate answer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.05em] font-body font-medium text-secondary/70 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
        )}

        <button
          onClick={handleShare}
          aria-label="Share answer"
          title="Share answer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.05em] font-body font-medium text-secondary/70 hover:text-primary hover:bg-primary/8 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {data.citations.length > 0 && (
          <button
            onClick={handleSaveAll}
            aria-label="Save citations to vault"
            title="Save to Vault"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.05em] font-body font-medium text-secondary/70 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <Bookmark className={`w-3.5 h-3.5 ${alreadySaved ? 'fill-primary text-primary' : ''}`} />
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        {data.citations.length > 0 && (
          <button
            onClick={() => onOpenSources?.(data.citations, data.query)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.05em] font-body font-medium text-primary hover:bg-primary/8 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Sources ({data.citations.length})
          </button>
        )}

        <span className="ml-auto text-[11px] font-body text-secondary/50 px-2">
          {data.chunks_retrieved} sources
        </span>
      </div>

    </div>
  );
};

export default AnswerCard;
