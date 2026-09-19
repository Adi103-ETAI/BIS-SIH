"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QueryResponse } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HistoryEntry {
  id: string;
  query: string;
  title: string;
  timestamp: number;
  sourcesUsed: string[];
  model?: string;
  response?: QueryResponse;
}

export interface VaultItem {
  id: string;
  title: string;
  sourceType: string;
  chunkText: string;
  score: number;
  savedAt: number;
  queryContext: string;
  mongoId?: string;
  tags?: string[];
  collectionId?: string | null;
  notes?: string;
}

export interface Collection {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

const HISTORY_KEY = "bis-sih_history";
const VAULT_KEY = "bis-sih_vault";
const COLLECTIONS_KEY = "bis-sih_collections";

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

const STOPWORDS = new Set([
  "what","whats","is","the","a","an","of","for","to","in","on","and","or","are","do","does","did",
  "how","why","when","where","with","about","can","should","would","could","tell","me","please",
  "i","we","you","us","my","your","their","his","her","this","that","these","those","be","been",
  "from","as","by","at","it","its",
]);

function generateTitle(query: string): string {
  const cleaned = query.trim().replace(/[?!.,;:]+$/g, "");
  if (cleaned.length <= 48) return capitalize(cleaned);
  const words = cleaned.split(/\s+/);
  const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const pick = (significant.length >= 3 ? significant : words).slice(0, 6).join(" ");
  const result = pick.length < cleaned.length ? `${pick}…` : pick;
  return capitalize(result);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Migration (once per user) ───
async function migrateLocalToCloud(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("migrated_at")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.migrated_at) return;

  const localHistory = loadFromStorage<HistoryEntry>(HISTORY_KEY, []);
  const localVault = loadFromStorage<VaultItem>(VAULT_KEY, []);
  const localCols = loadFromStorage<Collection>(COLLECTIONS_KEY, []);

  if (localHistory.length) {
    await supabase.from("query_history").insert(
      localHistory.map((h) => ({
        user_id: userId,
        query: h.query,
        title: h.title,
        sources_used: h.sourcesUsed,
        model: h.model ?? null,
        response: (h.response as unknown as never) ?? null,
        created_at: new Date(h.timestamp).toISOString(),
      }))
    );
  }
  if (localCols.length) {
    await supabase.from("collections").insert(
      localCols.map((c) => ({
        user_id: userId,
        name: c.name,
        color: c.color ?? null,
        created_at: new Date(c.createdAt).toISOString(),
      }))
    );
  }
  if (localVault.length) {
    await supabase.from("vault_items").insert(
      localVault.map((v) => ({
        user_id: userId,
        title: v.title,
        source_type: v.sourceType,
        chunk_text: v.chunkText,
        score: v.score,
        mongo_id: v.mongoId ?? null,
        tags: v.tags ?? [],
        notes: v.notes ?? null,
        query_context: v.queryContext,
        saved_at: new Date(v.savedAt).toISOString(),
      }))
    );
  }

  await supabase.from("profiles").update({ migrated_at: new Date().toISOString() }).eq("id", userId);
}

// ─── History Hook ───
export function useQueryHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadFromStorage(HISTORY_KEY, []));
  const migratedFor = useRef<string | null>(null);

  // Load from cloud or local on auth change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setHistory(loadFromStorage(HISTORY_KEY, []));
        return;
      }
      if (migratedFor.current !== userId) {
        migratedFor.current = userId;
        await migrateLocalToCloud(userId);
      }
      const { data } = await supabase
        .from("query_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled || !data) return;
      setHistory(
        data.map((r) => ({
          id: r.id,
          query: r.query,
          title: r.title ?? generateTitle(r.query),
          timestamp: new Date(r.created_at).getTime(),
          sourcesUsed: (r.sources_used ?? []) as string[],
          model: r.model ?? undefined,
          response: (r.response as unknown as QueryResponse | null) ?? undefined,
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Persist to localStorage when logged out
  useEffect(() => {
    if (!userId) saveToStorage(HISTORY_KEY, history);
  }, [history, userId]);

  const addEntry = useCallback(
    (query: string, response: QueryResponse) => {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : Date.now().toString();
      const entry: HistoryEntry = {
        id,
        query,
        title: generateTitle(query),
        timestamp: Date.now(),
        sourcesUsed: [...new Set(response.citations.map((c) => c.source_type))],
        model: response.model,
        response,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 50));
      if (userId) {
        supabase.from("query_history").insert({
          id,
          user_id: userId,
          query,
          title: entry.title,
          sources_used: entry.sourcesUsed,
          model: response.model ?? null,
          response: response as unknown as never,
        }).then(({ error }) => { if (error) console.error("history insert", error); });
      }
    },
    [userId]
  );

  const removeEntry = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((e) => e.id !== id));
      if (userId) supabase.from("query_history").delete().eq("id", id);
    },
    [userId]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (userId) supabase.from("query_history").delete().eq("user_id", userId);
  }, [userId]);

  return { history, addEntry, removeEntry, clearHistory };
}

// ─── Vault Hook ───
export function useVault() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<VaultItem[]>(() => loadFromStorage(VAULT_KEY, []));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setItems(loadFromStorage(VAULT_KEY, []));
        return;
      }
      const { data } = await supabase
        .from("vault_items")
        .select("*")
        .order("saved_at", { ascending: false });
      if (cancelled || !data) return;
      setItems(
        data.map((r) => ({
          id: r.id,
          title: r.title,
          sourceType: r.source_type,
          chunkText: r.chunk_text,
          score: Number(r.score ?? 0),
          savedAt: new Date(r.saved_at).getTime(),
          queryContext: r.query_context ?? "",
          mongoId: r.mongo_id ?? undefined,
          tags: (r.tags ?? []) as string[],
          collectionId: r.collection_id ?? null,
          notes: r.notes ?? undefined,
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) saveToStorage(VAULT_KEY, items);
  }, [items, userId]);

  const saveToVault = useCallback(
    (item: Omit<VaultItem, "id" | "savedAt">) => {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(36).slice(2, 6);
      const newItem: VaultItem = {
        ...item,
        id,
        savedAt: Date.now(),
        tags: item.tags ?? [],
        collectionId: item.collectionId ?? null,
      };
      setItems((prev) => [newItem, ...prev]);
      if (userId) {
        supabase.from("vault_items").insert({
          id,
          user_id: userId,
          title: newItem.title,
          source_type: newItem.sourceType,
          chunk_text: newItem.chunkText,
          score: newItem.score,
          mongo_id: newItem.mongoId ?? null,
          tags: newItem.tags ?? [],
          collection_id: newItem.collectionId ?? null,
          notes: newItem.notes ?? null,
          query_context: newItem.queryContext,
        }).then(({ error }) => { if (error) console.error("vault insert", error); });
      }
      return newItem;
    },
    [userId]
  );

  const removeFromVault = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (userId) supabase.from("vault_items").delete().eq("id", id);
    },
    [userId]
  );

  const updateVaultItem = useCallback(
    (id: string, patch: Partial<VaultItem>) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      if (userId) {
        const dbPatch: {
          title?: string;
          tags?: string[];
          collection_id?: string | null;
          notes?: string | null;
        } = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.tags !== undefined) dbPatch.tags = patch.tags;
        if (patch.collectionId !== undefined) dbPatch.collection_id = patch.collectionId;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
        if (Object.keys(dbPatch).length) {
          supabase.from("vault_items").update(dbPatch as never).eq("id", id);
        }
      }
    },
    [userId]
  );

  const isInVault = useCallback(
    (title: string, chunkText: string) =>
      items.some((i) => i.title === title && i.chunkText === chunkText),
    [items]
  );

  return { items, saveToVault, removeFromVault, updateVaultItem, isInVault };
}

// ─── Collections Hook ───
export function useCollections() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [collections, setCollections] = useState<Collection[]>(() =>
    loadFromStorage(COLLECTIONS_KEY, [])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setCollections(loadFromStorage(COLLECTIONS_KEY, []));
        return;
      }
      const { data } = await supabase
        .from("collections")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled || !data) return;
      setCollections(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color ?? undefined,
          createdAt: new Date(c.created_at).getTime(),
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) saveToStorage(COLLECTIONS_KEY, collections);
  }, [collections, userId]);

  const createCollection = useCallback(
    (name: string, color?: string) => {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(36).slice(2, 6);
      const newCollection: Collection = {
        id,
        name: name.trim(),
        color,
        createdAt: Date.now(),
      };
      setCollections((prev) => [newCollection, ...prev]);
      if (userId) {
        supabase.from("collections").insert({
          id,
          user_id: userId,
          name: newCollection.name,
          color: color ?? null,
        }).then(({ error }) => { if (error) console.error("collection insert", error); });
      }
      return newCollection;
    },
    [userId]
  );

  const renameCollection = useCallback(
    (id: string, name: string) => {
      setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
      if (userId) supabase.from("collections").update({ name: name.trim() }).eq("id", id);
    },
    [userId]
  );

  const deleteCollection = useCallback(
    (id: string) => {
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (userId) supabase.from("collections").delete().eq("id", id);
    },
    [userId]
  );

  return { collections, createCollection, renameCollection, deleteCollection };
}
