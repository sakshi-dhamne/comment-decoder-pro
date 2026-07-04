import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllCachedReplies } from "./replyCache";
import type { AnalysisResult } from "@/types/analysis";

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  positive: [34, 197, 94] as [number, number, number],
  negative: [239, 68, 68] as [number, number, number],
  neutral: [148, 163, 184] as [number, number, number],
  headerBg: [241, 245, 249] as [number, number, number],
};

function slug(s: string, max = 40): string {
  return s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, max) || "report";
}

export function generatePdfReport(result: AnalysisResult): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── Header ───
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 8, "F");
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.text);
  doc.text("Comment Insights Report", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(new Date().toLocaleString(), pageW - margin, y, { align: "right" });
  y += 20;

  // ─── Video info ───
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  const title = doc.splitTextToSize(result.video.title || "Untitled", pageW - margin * 2);
  doc.text(title, margin, y);
  y += title.length * 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  const meta = [
    result.video.channelTitle,
    `${Number(result.video.viewCount || 0).toLocaleString()} views`,
    `${Number(result.video.commentCount || 0).toLocaleString()} comments`,
    `${result.totalAnalyzed} analyzed`,
  ].filter(Boolean).join("  ·  ");
  doc.text(meta, margin, y);
  y += 18;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Section helper
  const section = (label: string) => {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(label.toUpperCase(), margin, y);
    y += 14;
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    ensureSpace(lines.length * 13);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 6;
  };

  const bulletList = (items: string[]) => {
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`•  ${item}`, pageW - margin * 2 - 12);
      ensureSpace(lines.length * 13);
      doc.text(lines, margin + 4, y);
      y += lines.length * 13 + 2;
    });
    y += 4;
  };

  // ─── Executive Summary ───
  if (result.insights?.summary) {
    section("Executive Summary");
    paragraph(result.insights.summary);
  }

  // ─── Sentiment ───
  section("Sentiment Breakdown");
  const total = result.totalAnalyzed || 1;
  const rows: [string, number, [number, number, number]][] = [
    ["Positive", result.sentiment.positive, COLORS.positive],
    ["Neutral", result.sentiment.neutral, COLORS.neutral],
    ["Negative", result.sentiment.negative, COLORS.negative],
  ];
  rows.forEach(([label, count, color]) => {
    ensureSpace(24);
    const pct = Math.round((count / total) * 100);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${count}  (${pct}%)`, pageW - margin, y, { align: "right" });
    y += 6;
    const barW = pageW - margin * 2;
    doc.setFillColor(...COLORS.border);
    doc.roundedRect(margin, y, barW, 6, 2, 2, "F");
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, (barW * count) / total, 6, 2, 2, "F");
    y += 16;
  });
  y += 6;

  // ─── Top Topics ───
  if (result.topics?.length) {
    section("Top Topics");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Topic", "Mentions"]],
      body: result.topics.slice(0, 10).map((t) => [t.topic, String(t.count)]),
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.text, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6, textColor: COLORS.text },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: { 1: { halign: "right", cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ─── Categories ───
  const catEntries = Object.entries(result.categories || {}).filter(([, v]) => v > 0);
  if (catEntries.length) {
    section("Categories");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Category", "Count"]],
      body: catEntries.sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.text, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6, textColor: COLORS.text },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: { 1: { halign: "right", cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ─── Likes / Dislikes / Complaints ───
  const insightBlocks: [string, string[] | undefined][] = [
    ["What Viewers Liked", result.insights?.likes],
    ["What Viewers Disliked", result.insights?.dislikes],
    ["Common Complaints", result.insights?.complaints],
    ["Recommendations", result.insights?.recommendations],
  ];
  insightBlocks.forEach(([label, items]) => {
    if (items && items.length) {
      section(label);
      bulletList(items);
    }
  });

  // ─── Next Steps ───
  if (result.insights?.nextSteps?.length) {
    section("Next Steps");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Priority", "Action", "Rationale"]],
      body: result.insights.nextSteps.map((n) => [n.priority.toUpperCase(), n.action, n.rationale]),
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.text, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6, textColor: COLORS.text, valign: "top" },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" }, 1: { cellWidth: 170 } },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ─── Comments & Replies ───
  section("Comments & AI Replies");
  const body: any[] = [];
  (result.comments || []).slice(0, 100).forEach((c) => {
    const cached = getAllCachedReplies(c.text, result.video?.title);
    const tones = Object.keys(cached);
    const replies = tones.length
      ? tones.map((t) => `[${t}] ${(cached[t] || []).join(" | ")}`).join("\n\n")
      : "—";
    body.push([c.author, c.sentiment, c.text, replies]);
  });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Author", "Sentiment", "Comment", "AI Reply"]],
    body,
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.text, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 5, textColor: COLORS.text, valign: "top", overflow: "linebreak" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 55 },
      2: { cellWidth: 200 },
      3: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw).toLowerCase();
        if (v === "positive") data.cell.styles.textColor = COLORS.positive;
        else if (v === "negative") data.cell.styles.textColor = COLORS.negative;
        else data.cell.styles.textColor = COLORS.muted;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ─── Footer on every page ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text("comment-decoder-pro", margin, pageH - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const filename = `insights-${slug(result.video?.title || "report")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
