"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useQueryHistory,
  useVault,
  useCollections,
  type HistoryEntry,
  type VaultItem,
  type Collection,
} from "@/hooks/use-store";
import type { QueryResponse } from "@/types/api";

interface StoreContextType {
  history: HistoryEntry[];
  addHistoryEntry: (query: string, response: QueryResponse) => void;
  removeHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  vaultItems: VaultItem[];
  saveToVault: (item: Omit<VaultItem, "id" | "savedAt">) => VaultItem;
  removeFromVault: (id: string) => void;
  updateVaultItem: (id: string, patch: Partial<VaultItem>) => void;
  isInVault: (title: string, chunkText: string) => boolean;
  collections: Collection[];
  createCollection: (name: string, color?: string) => Collection;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { history, addEntry, removeEntry, clearHistory } = useQueryHistory();
  const { items, saveToVault, removeFromVault, updateVaultItem, isInVault } = useVault();
  const { collections, createCollection, renameCollection, deleteCollection } = useCollections();

  return (
    <StoreContext.Provider
      value={{
        history,
        addHistoryEntry: addEntry,
        removeHistoryEntry: removeEntry,
        clearHistory,
        vaultItems: items,
        saveToVault,
        removeFromVault,
        updateVaultItem,
        isInVault,
        collections,
        createCollection,
        renameCollection,
        deleteCollection,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
