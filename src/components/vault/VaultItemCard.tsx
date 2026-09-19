"use client";

import { useState } from "react";
import { ExternalLink, Trash2, ChevronDown, Tag, X, Plus, FolderInput } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getSourceConfig } from "@/lib/sources";
import type { SourceType } from "@/types/api";
import type { VaultItem, Collection } from "@/hooks/use-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface VaultItemCardProps {
  item: VaultItem;
  collections: Collection[];
  onRemove: (id: string, title: string) => void;
  onUpdate: (id: string, patch: Partial<VaultItem>) => void;
}

const VaultItemCard = ({ item, collections, onRemove, onUpdate }: VaultItemCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const truncated = item.chunkText.length > 150;
  const displayText = expanded ? item.chunkText : item.chunkText.slice(0, 150) + (truncated ? "…" : "");
  const sourceConfig = getSourceConfig(item.sourceType as SourceType);
  const tags = item.tags ?? [];
  const currentCollection = collections.find((c) => c.id === item.collectionId);

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      onUpdate(item.id, { tags: [...tags, t] });
    }
    setTagInput("");
    setAddingTag(false);
  };

  const handleRemoveTag = (tag: string) => {
    onUpdate(item.id, { tags: tags.filter((t) => t !== tag) });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:shadow-md transition-all duration-200 group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full text-white shrink-0 ${sourceConfig.colorClass}`}
          >
            {sourceConfig.label}
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Move to collection"
                aria-label="Move to collection"
              >
                <FolderInput className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Move to collection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdate(item.id, { collectionId: null })}>
                {item.collectionId == null && <span className="mr-1.5">✓</span>}
                Unfiled
              </DropdownMenuItem>
              {collections.length === 0 && (
                <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
              )}
              {collections.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onUpdate(item.id, { collectionId: c.id })}>
                  {item.collectionId === c.id && <span className="mr-1.5">✓</span>}
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {item.sourceType === "pubmed" && item.mongoId && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${item.mongoId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View on PubMed"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onRemove(item.id, item.title)}
            className="text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Remove from vault"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Query context */}
      <p className="text-[11px] text-muted-foreground/70 mb-2">From query: &quot;{item.queryContext}&quot;</p>

      {/* Passage */}
      <p className="text-xs text-muted-foreground leading-relaxed">&quot;{displayText}&quot;</p>

      {truncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-primary font-medium mt-1.5 flex items-center gap-0.5 hover:underline"
        >
          {expanded ? "Hide passage" : "Show full passage"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {currentCollection && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            📁 {currentCollection.name}
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground"
          >
            <Tag className="w-2.5 h-2.5" />
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 text-muted-foreground hover:text-destructive"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag();
              if (e.key === "Escape") {
                setAddingTag(false);
                setTagInput("");
              }
            }}
            onBlur={handleAddTag}
            placeholder="tag name"
            className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground outline-none focus:ring-1 focus:ring-primary/40 w-24"
          />
        ) : (
          <button
            onClick={() => setAddingTag(true)}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" />
            Add tag
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground/60">
          Saved {formatDistanceToNow(item.savedAt, { addSuffix: true })}
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          Relevance: {Math.round(item.score * 100)}%
        </span>
      </div>
    </div>
  );
};

export default VaultItemCard;
