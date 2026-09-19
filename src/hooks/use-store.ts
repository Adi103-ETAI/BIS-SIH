"use client";

import { useState, useEffect, useCallback } from "react";
import type { QueryResponse } from "@/types/api";

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
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Generate a short, human-readable title from the query (and optional answer)
const STOPWORDS = new Set([
  "what", "whats", "is", "the", "a", "an", "of", "for", "to", "in", "on", "and",
  "or", "are", "do", "does", "did", "how", "why", "when", "where", "with", "about",
  "can", "should", "would", "could", "tell", "me", "please", "i", "we", "you", "us",
  "my", "your", "their", "his", "her", "this", "that", "these", "those", "be", "been",
  "from", "as", "by", "at", "it", "its",
]);

function generateTitle(query: string, _answer?: string): string {
  const cleaned = query.trim().replace(/[?!.,;:]+$/g, "");
  if (cleaned.length <= 48) return capitalize(cleaned);

  // Take meaningful words (skip stopwords) up to ~6 words
  const words = cleaned.split(/\s+/);
  const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const pick = (significant.length >= 3 ? significant : words).slice(0, 6).join(" ");
  const result = pick.length < cleaned.length ? `${pick}…` : pick;
  return capitalize(result);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── History Hook ───
export function useQueryHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadFromStorage(HISTORY_KEY, []));

  useEffect(() => {
    saveToStorage(HISTORY_KEY, history);
  }, [history]);

  const addEntry = useCallback((query: string, response: QueryResponse) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      query,
      title: generateTitle(query, response.answer),
      timestamp: Date.now(),
      sourcesUsed: [...new Set(response.citations.map((c) => c.source_type))],
      model: response.model,
      response,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}

// ─── Vault Hook ───
export function useVault() {
  const [items, setItems] = useState<VaultItem[]>(() => loadFromStorage(VAULT_KEY, []));

  useEffect(() => {
    saveToStorage(VAULT_KEY, items);
  }, [items]);

  const saveToVault = useCallback((item: Omit<VaultItem, "id" | "savedAt">) => {
    const newItem: VaultItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      savedAt: Date.now(),
      tags: item.tags ?? [],
      collectionId: item.collectionId ?? null,
    };
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  }, []);

  const removeFromVault = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateVaultItem = useCallback((id: string, patch: Partial<VaultItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const isInVault = useCallback(
    (title: string, chunkText: string) => {
      return items.some((i) => i.title === title && i.chunkText === chunkText);
    },
    [items]
  );

  return { items, saveToVault, removeFromVault, updateVaultItem, isInVault };
}

// ─── Collections Hook ───
export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(() =>
    loadFromStorage(COLLECTIONS_KEY, [])
  );

  useEffect(() => {
    saveToStorage(COLLECTIONS_KEY, collections);
  }, [collections]);

  const createCollection = useCallback((name: string, color?: string) => {
    const newCollection: Collection = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      color,
      createdAt: Date.now(),
    };
    setCollections((prev) => [newCollection, ...prev]);
    return newCollection;
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { collections, createCollection, renameCollection, deleteCollection };
}
