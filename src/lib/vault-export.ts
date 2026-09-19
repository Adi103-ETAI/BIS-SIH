import jsPDF from "jspdf";
import type { VaultItem, Collection } from "@/hooks/use-store";

// ─── BibTeX export ───
function escapeBibtex(value: string): string {
  return value.replace(/[{}\\]/g, (m) => `\\${m}`).replace(/\s+/g, " ").trim();
}

function bibtexKey(item: VaultItem): string {
  const titleSlug = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return `${item.sourceType}_${titleSlug || "ref"}_${item.id.slice(-4)}`;
}

export function vaultToBibtex(items: VaultItem[]): string {
  const entries = items.map((item) => {
    const key = bibtexKey(item);
    const year = new Date(item.savedAt).getFullYear();
    const fields: string[] = [
      `  title = {${escapeBibtex(item.title)}}`,
      `  howpublished = {${item.sourceType.toUpperCase()}}`,
      `  year = {${year}}`,
      `  note = {${escapeBibtex(item.chunkText.slice(0, 240))}${item.chunkText.length > 240 ? "..." : ""}}`,
    ];
    return `@misc{${key},\n${fields.join(",\n")}\n}`;
  });
  return entries.join("\n\n") + "\n";
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PDF export ───
export function vaultToPdf(items: VaultItem[], opts?: { title?: string; collection?: Collection | null }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(opts?.title ?? "Standards Vault Export", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const meta = `${items.length} citation${items.length !== 1 ? "s" : ""} • Exported ${new Date().toLocaleString()}`;
  doc.text(meta, margin, y);
  y += 12;
  if (opts?.collection) {
    doc.text(`Collection: ${opts.collection.name}`, margin, y);
    y += 12;
  }
  y += 8;

  // Divider
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  items.forEach((item, idx) => {
    ensureSpace(80);

    // Header line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    const titleLines = doc.splitTextToSize(`${idx + 1}. ${item.title}`, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 14;

    // Meta row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const metaParts = [
      item.sourceType.toUpperCase(),
      `Relevance: ${Math.round(item.score * 100)}%`,
      `Saved: ${new Date(item.savedAt).toLocaleDateString()}`,
    ];
    if (item.tags && item.tags.length > 0) metaParts.push(`Tags: ${item.tags.join(", ")}`);
    doc.text(metaParts.join("  •  "), margin, y);
    y += 14;

    // Query context
    if (item.queryContext) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(140);
      const ctxLines = doc.splitTextToSize(`From query: "${item.queryContext}"`, contentWidth);
      ensureSpace(ctxLines.length * 12 + 6);
      doc.text(ctxLines, margin, y);
      y += ctxLines.length * 12 + 4;
    }

    // Passage
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(50);
    const passageLines = doc.splitTextToSize(`"${item.chunkText}"`, contentWidth);
    ensureSpace(passageLines.length * 13 + 10);
    doc.text(passageLines, margin, y);
    y += passageLines.length * 13 + 6;

    // Notes
    if (item.notes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(90);
      const noteLines = doc.splitTextToSize(`Note: ${item.notes}`, contentWidth);
      ensureSpace(noteLines.length * 12 + 6);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 12 + 4;
    }

    y += 14;
    // Divider between entries
    if (idx < items.length - 1) {
      ensureSpace(14);
      doc.setDrawColor(235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
    }
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`BIS Chat Standards Vault — Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 20, {
      align: "center",
    });
  }

  doc.save(`bis-chat-vault-${new Date().toISOString().slice(0, 10)}.pdf`);
}
