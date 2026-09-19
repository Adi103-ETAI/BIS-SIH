"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BookOpen, Bookmark, Search, Filter, Download, ChevronDown, FileText, FileCode,
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import CollectionsSidebar from "@/components/vault/CollectionsSidebar";
import VaultItemCard from "@/components/vault/VaultItemCard";
import { vaultToBibtex, vaultToPdf, downloadFile } from "@/lib/vault-export";

const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "bis", label: "BIS" },
  { value: "iso", label: "ISO" },
  { value: "iec", label: "IEC" },
];

const VaultView = () => {
  const { toast } = useToast();
  const {
    vaultItems, removeFromVault, updateVaultItem,
    collections, createCollection, renameCollection, deleteCollection,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState<string | "all" | "unfiled">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isInitializing] = useState(false);

  // Collection counts
  const counts = useMemo(() => {
    const byId: Record<string, number> = {};
    let unfiled = 0;
    for (const item of vaultItems) {
      if (item.collectionId) {
        byId[item.collectionId] = (byId[item.collectionId] ?? 0) + 1;
      } else {
        unfiled++;
      }
    }
    return { all: vaultItems.length, unfiled, byId };
  }, [vaultItems]);

  // All tags across vault
  const allTags = useMemo(() => {
    const set = new Set<string>();
    vaultItems.forEach((i) => (i.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [vaultItems]);

  const filteredItems = useMemo(() => {
    return vaultItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.chunkText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.queryContext.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = sourceFilter === "all" || item.sourceType === sourceFilter;
      const matchesCollection =
        selectedCollection === "all" ||
        (selectedCollection === "unfiled" ? !item.collectionId : item.collectionId === selectedCollection);
      const matchesTag = !tagFilter || (item.tags ?? []).includes(tagFilter);
      return matchesSearch && matchesSource && matchesCollection && matchesTag;
    });
  }, [vaultItems, searchQuery, sourceFilter, selectedCollection, tagFilter]);

  const handleRemove = useCallback((id: string, title: string) => {
    removeFromVault(id);
    toast({ title: "Removed from Vault", description: `"${title}" has been removed.` });
  }, [removeFromVault, toast]);

  const handleCreateCollection = useCallback((name: string) => {
    createCollection(name);
    toast({ title: "Collection created", description: `"${name}" is ready.` });
  }, [createCollection, toast]);

  const handleDeleteCollection = useCallback((id: string) => {
    deleteCollection(id);
    if (selectedCollection === id) setSelectedCollection("all");
    toast({ title: "Collection deleted" });
  }, [deleteCollection, selectedCollection, toast]);

  const handleExportBibtex = () => {
    const bib = vaultToBibtex(filteredItems);
    downloadFile("bis-chat-vault.bib", bib, "application/x-bibtex");
    toast({ title: "BibTeX exported", description: `${filteredItems.length} citations exported.` });
  };

  const handleExportPdf = () => {
    const col = selectedCollection !== "all" && selectedCollection !== "unfiled"
      ? collections.find((c) => c.id === selectedCollection) ?? null
      : null;
    vaultToPdf(filteredItems, { collection: col });
    toast({ title: "PDF exported", description: `${filteredItems.length} citations exported.` });
  };

  return (
    <BoneyardSkeleton
      loading={isInitializing}
      animate="shimmer"
      className="w-full"
      fallback={
        <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg skeleton-shimmer" />
              <div className="space-y-1.5">
                <div className="w-44 h-6 rounded-md skeleton-shimmer" />
                <div className="w-32 h-3 rounded-md skeleton-shimmer" />
              </div>
            </div>
            <div className="w-24 h-9 rounded-lg skeleton-shimmer" />
          </div>
          {/* Body skeleton: sidebar + (toolbar + cards) */}
          <div className="grid lg:grid-cols-[220px_1fr] gap-6">
            <div className="space-y-2">
              <div className="h-10 rounded-lg skeleton-shimmer" />
              <div className="h-9 rounded-lg skeleton-shimmer" />
              <div className="h-9 rounded-lg skeleton-shimmer" />
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 h-10 rounded-lg skeleton-shimmer" />
                <div className="w-32 h-10 rounded-lg skeleton-shimmer" />
              </div>
              <div className="h-28 rounded-xl skeleton-shimmer" />
              <div className="h-28 rounded-xl skeleton-shimmer" />
              <div className="h-28 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      }
    >
      <div className="w-full h-full flex flex-col animate-fade-up">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-sm">
          <div className="w-full py-5 px-2 sm:px-4 lg:px-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-heading font-semibold tracking-tight text-foreground truncate">
                    Standards Vault
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {vaultItems.length} saved citation{vaultItems.length !== 1 ? "s" : ""} •{" "}
                    {collections.length} collection{collections.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={filteredItems.length === 0}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Export {filteredItems.length} citation{filteredItems.length !== 1 ? "s" : ""}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportPdf}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportBibtex}>
                    <FileCode className="w-4 h-4 mr-2" />
                    BibTeX (.bib)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full w-full px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
            <div className="grid lg:grid-cols-[200px_1fr] gap-0 h-full items-start">
          <CollectionsSidebar
            collections={collections}
            selectedId={selectedCollection}
            onSelect={setSelectedCollection}
            onCreate={handleCreateCollection}
            onRename={renameCollection}
            onDelete={handleDeleteCollection}
            counts={counts}
          />

          <div className="min-w-0 pl-2">
            {/* Toolbar: search + filter */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved citations..."
                  className="w-full h-10 pl-10 pr-4 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full sm:w-auto h-10 pl-10 pr-8 text-sm bg-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                >
                  {SOURCE_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Tag chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Tags:</span>
                <button
                  onClick={() => setTagFilter(null)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                    tagFilter === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                      tagFilter === tag
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Items */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-xl bg-card/30">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Bookmark className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {vaultItems.length === 0 ? "No saved citations yet" : "No matches found"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {vaultItems.length === 0
                    ? "Save citations from standards answers by clicking the bookmark icon on any citation card."
                    : "Try adjusting your search, source filter, tag, or collection."}
                </p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2">
                {filteredItems.map((item) => (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    collections={collections}
                    onRemove={handleRemove}
                    onUpdate={updateVaultItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
    </BoneyardSkeleton>
  );
};

export default VaultView;
