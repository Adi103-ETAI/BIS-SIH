"use client";

import { useState } from "react";
import { Plus, Folder, Trash2, Pencil, Check, X, Inbox, BookOpen } from "lucide-react";
import type { Collection } from "@/hooks/use-store";

interface CollectionsSidebarProps {
  collections: Collection[];
  selectedId: string | "all" | "unfiled";
  onSelect: (id: string | "all" | "unfiled") => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  counts: { all: number; unfiled: number; byId: Record<string, number> };
}

const CollectionsSidebar = ({
  collections,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  counts,
}: CollectionsSidebarProps) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName("");
      setCreating(false);
    }
  };

  const startEdit = (c: Collection) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const ItemRow = ({
    active,
    icon,
    label,
    count,
    onClick,
    children,
  }: {
    active: boolean;
    icon: React.ReactNode;
    label: React.ReactNode;
    count: number;
    onClick: () => void;
    children?: React.ReactNode;
  }) => (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      }`}
      onClick={onClick}
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-xs font-medium truncate">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{count}</span>
      {children}
    </div>
  );

  return (
    <aside className="vault-sidebar">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="New collection"
          aria-label="New collection"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="vault-sidebar-scroll">
        <div className="space-y-0.5">
        <ItemRow
          active={selectedId === "all"}
          icon={<BookOpen className="w-4 h-4" />}
          label="All citations"
          count={counts.all}
          onClick={() => onSelect("all")}
        />
        <ItemRow
          active={selectedId === "unfiled"}
          icon={<Inbox className="w-4 h-4" />}
          label="Unfiled"
          count={counts.unfiled}
          onClick={() => onSelect("unfiled")}
        />

        {creating && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted/50">
            <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Collection name"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button onClick={handleCreate} className="text-primary" aria-label="Confirm">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="text-muted-foreground"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {collections.map((c) => {
          const active = selectedId === c.id;
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
              }`}
              onClick={() => !isEditing && onSelect(c.id)}
            >
              <Folder className="w-4 h-4 shrink-0" />
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-sm outline-none border-b border-primary/30"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      commitEdit();
                    }}
                    className="text-primary"
                    aria-label="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums group-hover:hidden">
                    {counts.byId[c.id] ?? 0}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(c);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete collection "${c.name}"? Citations will become unfiled.`)) {
                          onDelete(c.id);
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </aside>
  );
};

export default CollectionsSidebar;
