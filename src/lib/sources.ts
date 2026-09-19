import type { SourceType } from "@/types/api";

const SOURCE_CONFIG: Record<SourceType, { label: string; colorClass: string }> = {
  icmr: { label: "ICMR", colorClass: "bg-source-icmr" },
  pubmed: { label: "PubMed", colorClass: "bg-source-pubmed" },
  cochrane: { label: "Cochrane", colorClass: "bg-source-cochrane" },
  who: { label: "WHO", colorClass: "bg-source-who" },
  cdc: { label: "CDC", colorClass: "bg-source-cdc" },
  statpearls: { label: "StatPearls", colorClass: "bg-source-statpearls" },
  nmc: { label: "NMC", colorClass: "bg-source-nmc" },
};

export function getSourceConfig(type: SourceType) {
  return SOURCE_CONFIG[type] ?? { label: type.toUpperCase(), colorClass: "bg-muted" };
}
