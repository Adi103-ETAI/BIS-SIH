"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import QueryZone from "@/components/QueryZone";
import AnswerCard from "@/components/AnswerCard";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Footer from "@/components/Footer";
import SourcesPanel from "@/components/SourcesPanel";
import { useStore } from "@/contexts/StoreContext";
import type { QueryResponse, Citation } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

// Canned demo content for UI testing without a backend: open /?demo=answer,
// /?demo=empty, or /?demo=error. Never sent to history or the network.
const DEMO_QUERY = "What are the requirements for drinking water as per IS 10500?";

const DEMO_RESPONSE: QueryResponse = {
  answer: `# IS 10500 Requirements

Drinking water shall comply with Table 1 [1] and the bacteriological limits in clause 6.2 [2].

| Parameter | Limit |
|---|---|
| pH | 6.5-8.5 |
| TDS | 500 mg/L |

\`\`\`
sample_id = BIS-2024-001
\`\`\`

- Collect the sample as per IS 3025
- Test in a BIS-recognised lab

> Tip: ask about a specific clause next, e.g. “What does clause 6.2 require?”, for exact limits.`,
  citations: [
    {
      index: 1,
      title: "IS 10500:2012 Table 1",
      source_type: "bis",
      chunk_text:
        "Table 1 lists organoleptic and physical parameters for drinking water including pH 6.5 to 8.5 and TDS max 500 mg per litre when tested as per IS 3025.",
      score: 0.94,
      mongo_id: "demo-abc123",
    },
    {
      index: 2,
      title: "IS 10500 Clause 6.2",
      source_type: "bis",
      chunk_text:
        "Clause 6.2 specifies bacteriological requirements and sampling frequency for piped water supplies with reference to IS 1622.",
      score: 0.87,
      mongo_id: "demo-def456",
    },
  ],
  chunks_retrieved: 2,
  query: DEMO_QUERY,
  model: "demo",
  mode: "standard",
};

type ChatMessage = {
  id: string;
  query: string;
  response?: QueryResponse;
  status: "loading" | "success" | "empty" | "error";
  timestamp: number;
  error?: string;
};

const REQUEST_TIMEOUT_MS = 30000;

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const IndexView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addHistoryEntry, history } = useStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledNavigationRef = useRef<string | null>(null);
  const latestMessageStatus = messages[messages.length - 1]?.status;
  const inFlightRef = useRef(new Map<string, AbortController>());

  const [activeSources, setActiveSources] = useState<{ citations: Citation[]; queryContext: string } | null>(null);

  // Esc closes the sources panel and returns focus to the chat region.
  useEffect(() => {
    if (!activeSources) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSources(null);
        scrollRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSources]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, latestMessageStatus]);

  const handleQuery = useCallback(async (query: string) => {
    const newMessageId = Date.now().toString();
    setMessages((prev) => [...prev, { id: newMessageId, query, status: "loading", timestamp: Date.now() }]);

    const controller = new AbortController();
    inFlightRef.current.set(newMessageId, controller);
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 8 }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = "API error";
        try {
          const err = await res.json();
          detail = err?.detail || detail;
        } catch {
          // Ignore JSON parse issues and keep the fallback detail.
        }
        throw new Error(detail);
      }

      const raw = await res.json();
      const json: QueryResponse = {
        answer: raw?.answer ?? "",
        citations: raw?.citations ?? [],
        chunks_retrieved: raw?.chunks_retrieved ?? 0,
        query,
        model: "nim",
        mode: "standard",
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessageId
            ? {
                ...msg,
                response: json,
                status: json.chunks_retrieved === 0 ? "empty" : "success",
              }
            : msg,
        ),
      );

      if (json.chunks_retrieved > 0) {
        try {
          addHistoryEntry(query, json);
        } catch (err) {
          console.error("Failed to persist query history", err);
        }
      }
    } catch (err) {
      const isAbort =
        err instanceof DOMException ? err.name === "AbortError" : err instanceof Error && err.name === "AbortError";
      const message = isAbort
        ? timedOut
          ? "Request timed out after 30s. Please try again."
          : "Request cancelled."
        : err instanceof Error
          ? err.message
          : "Query request failed.";
      console.error("Query request failed", err);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === newMessageId ? { ...msg, status: "error" as const, error: message } : msg)),
      );
    } finally {
      window.clearTimeout(timeoutId);
      inFlightRef.current.delete(newMessageId);
    }
  }, [addHistoryEntry]);

  const handleStop = useCallback(() => {
    inFlightRef.current.forEach((controller) => controller.abort());
  }, []);

  useEffect(() => {
    const inFlight = inFlightRef.current;
    return () => {
      inFlight.forEach((controller) => controller.abort());
      inFlight.clear();
    };
  }, []);

  useEffect(() => {
    const navKey = `${pathname}?${searchParams.toString()}`;
    if (handledNavigationRef.current === navKey) return;

    const loadQuery = searchParams.get("query") ?? undefined;
    const loadHistoryId = searchParams.get("historyId") ?? undefined;
    const newConvo = searchParams.get("new") === "1";
    const demo = searchParams.get("demo") ?? undefined;

    if (!loadQuery && !loadHistoryId && !newConvo && !demo) return;

    let didHandle = false;

    if (demo) {
      const stamp = Date.now();
      if (demo === "error") {
        setMessages([
          {
            id: `${stamp}`,
            query: DEMO_QUERY,
            status: "error",
            error: "Demo error: upstream search returned 502 (Bad Gateway).",
            timestamp: stamp,
          },
        ]);
      } else if (demo === "empty") {
        setMessages([
          {
            id: `${stamp}`,
            query: "What is the mating call of the Himalayan snow leopard as per IS?",
            status: "empty",
            timestamp: stamp,
          },
        ]);
      } else {
        setMessages([
          { id: `${stamp}-q`, query: DEMO_QUERY, status: "success", response: DEMO_RESPONSE, timestamp: stamp },
        ]);
      }
      didHandle = true;
    }

    if (newConvo) {
      setMessages([]);
      didHandle = true;
    }

    if (loadHistoryId) {
      const entry = history.find((item) => item.id === loadHistoryId);
      if (entry) {
        if (entry.response) {
          const restoredMessageId = Date.now().toString();
          setMessages([
            {
              id: restoredMessageId,
              query: entry.query,
              response: entry.response,
              status: entry.response.chunks_retrieved === 0 ? "empty" : "success",
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages([]);
          handleQuery(entry.query);
        }
        didHandle = true;
      }
    }

    if (!didHandle && loadQuery) {
      setMessages([]);
      handleQuery(loadQuery);
      didHandle = true;
    }

    if (didHandle) {
      handledNavigationRef.current = navKey;
      router.replace(pathname || "/");
    }
  }, [pathname, searchParams, history, handleQuery, router]);

  const handleRetry = (msgId: string, query: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    handleQuery(query);
  };

  const FOLLOW_UPS = [
    "Explain in simple terms",
    "Which IS code applies here?",
    "What are the certification steps?",
  ];

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full bg-background overflow-hidden w-full">
      <PanelGroup direction="horizontal" autoSaveId="sources-panel-layout">
        <Panel defaultSize={100} minSize={30} className="relative flex flex-col h-full">
          <div ref={scrollRef} tabIndex={-1} className="flex-1 overflow-y-auto w-full custom-scrollbar pb-36 focus:outline-none">
            {!hasMessages ? (
              <div className="h-full flex flex-col items-center justify-center -mt-8">
                <QueryZone onSubmit={handleQuery} isLoading={false} hasResults={false} />
                <Footer visible={true} />
              </div>
            ) : (
              <div className="w-full max-w-3xl md:max-w-4xl xl:max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
                {messages.map((msg, idx) => (
                  <div key={msg.id} className="space-y-6 animate-fade-up">
                    {(idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1].timestamp).toDateString()) && (
                      <p className="text-center text-[10px] uppercase tracking-[0.5px] font-body text-secondary/50 my-4">
                        {new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <div className="bg-card journal-shadow rounded-2xl rounded-tr-sm max-w-[92%] sm:max-w-[85%] lg:max-w-[75%] px-4 sm:px-5 py-3 sm:py-3.5">
                        <p className="text-[14px] sm:text-[15px] font-body text-foreground leading-relaxed">{msg.query}</p>
                        <p className="text-[10px] font-body text-secondary/40 mt-1.5 text-right">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="w-full">
                        {msg.status === "loading" && <LoadingState />}
                        {msg.status === "success" && msg.response && (
                          <>
                            <AnswerCard
                              data={msg.response}
                              onRegenerate={() => handleRetry(msg.id, msg.query)}
                              onOpenSources={(citations, queryContext) => setActiveSources({ citations, queryContext })}
                            />
                            <div className="flex flex-wrap gap-2 pt-1">
                              {FOLLOW_UPS.map((chip) => (
                                <button
                                  key={chip}
                                  onClick={() => handleQuery(chip)}
                                  className="text-[12px] font-body font-medium text-secondary border border-border px-3.5 py-2 rounded-full hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {msg.status === "empty" && <EmptyState onRetry={() => handleRetry(msg.id, msg.query)} />}
                        {msg.status === "error" && (
                          <ErrorState message={msg.error} onRetry={() => handleRetry(msg.id, msg.query)} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasMessages && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pb-6 pt-14 pointer-events-none">
              <div className="max-w-3xl md:max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-auto">
                <QueryZone
                  onSubmit={handleQuery}
                  onStop={handleStop}
                  isLoading={messages[messages.length - 1]?.status === "loading"}
                  hasResults={true}
                />
              </div>
            </div>
          )}
        </Panel>

        {activeSources && (
          <>
            <PanelResizeHandle className="w-1.5 bg-border/20 hover:bg-primary/20 transition-colors cursor-col-resize flex-shrink-0 relative group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-border/40 group-hover:bg-primary/40 rounded-full transition-colors" />
            </PanelResizeHandle>
            <Panel defaultSize={35} minSize={25} maxSize={50}>
              <SourcesPanel
                citations={activeSources.citations}
                queryContext={activeSources.queryContext}
                onClose={() => setActiveSources(null)}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default IndexView;
