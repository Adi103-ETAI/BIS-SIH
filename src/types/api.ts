export type SourceType = "icmr" | "pubmed" | "cochrane" | "who" | "cdc" | "statpearls" | "nmc";

export interface Citation {
  index: number;
  title: string;
  source_type: SourceType;
  chunk_text: string;
  score: number;
  mongo_id: string;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  query: string;
  model: string;
  chunks_retrieved: number;
  mode: string;
}
