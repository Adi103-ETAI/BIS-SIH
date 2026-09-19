import type { SourceType } from "@/types/api";

const SOURCE_CONFIG: Record<SourceType, { label: string; colorClass: string }> = {
  bis: { label: "BIS", colorClass: "bg-source-bis" },
  iso: { label: "ISO", colorClass: "bg-source-iso" },
  iec: { label: "IEC", colorClass: "bg-source-iec" },
};

export function getSourceConfig(type: SourceType) {
  return SOURCE_CONFIG[type] ?? { label: type.toUpperCase(), colorClass: "bg-muted" };
}
